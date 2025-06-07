import * as modules from './modules.js';
import * as utils from './utils.js';
import * as send from './responses.js';
import * as translator from './translate.js'
import * as settings_db from '../database/db_settings_functions.js';
import * as users_db from '../database/db_users_functions.js';
import * as mfa_db from '../database/db_mfa_functions.js';
import * as friends_request from '../database/db_friend_request.js'
import qrcode from 'qrcode';
import { json } from 'stream/consumers';
import { response } from 'express';
import { promises as fs, utimes } from 'fs';
import { encrypt_google } from './utils.js';
import http from 'http';
import { parse } from 'path';

async function login(request, response) {
    var [keys, values] = modules.get_cookies(request);
    if (keys?.includes('token'))
        return await home(request, response);
    if (request.method === "POST") {
        const parsed = await utils.process_login(request, response);
        if (!parsed || parsed === undefined || parsed < 0)
            return true;
        const token = await modules.create_jwt(parsed.settings.self, '1h');
        const lang = await modules.create_jwt(parsed.settings.lang, '1h');

        modules.set_cookie(response, 'token', token, 3600);
        modules.set_cookie(response, 'lang', lang, 3600);

        response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'success', "Settings": parsed.settings, "Mfa": parsed.mfa, "Content": null})
        return true;
    }
    await send.send_html('index.html', response, 200, async (data) => {
        data = await utils.replace_all_templates(request, response, 1);
        data = utils.show_page(data, "login_div");
        return data;
    });
    return true;
}

async function register(request, response) {
    var [keys, values] = modules.get_cookies(request);
    if (keys?.includes('token'))
        return await home(request, response);
    if (request.method == 'POST') {
        const replace_data = request.body;
        const check_settings = await settings_db.get_settings_value('email', replace_data.email);
        if (check_settings || check_settings !== undefined) {
            response.code(409).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'User already exists', "Content": null});
            return true;
        }
        if (replace_data.password.length > 71) {
            response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'Password too long', "Content": null});
            return true;
        }
        const hashed = await modules.create_encrypted_password(replace_data.password);
        if (!hashed || hashed === undefined || hashed < 0) {
            response.code(500).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'Bcrypt error', "Content": null});
            return true;
        }
        const settings = await settings_db.create_settings_value(hashed, replace_data.pfp, 0, replace_data.email, 'en', '', '');
        if (!settings || settings === undefined || settings < 0) {
            response.code(500).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'Failed creating table in settings', "Content": null});
            return true;
        }
        const user = await users_db.create_users_value(0, replace_data.username, settings.self);
        if (!user || user === undefined || user < 0) {
            await settings_db.delete_settings_value(settings.self);
            response.code(500).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'Failed creating table in user', "Content": null});
            return true;
        }
        const token = await modules.create_jwt(settings.self, '1h');
        const lang = await modules.create_jwt('en', '1h');
        
        modules.set_cookie(response, 'token', token, 3600); //todo change back to 3600
        modules.set_cookie(response, 'lang', lang, 3600); //todo change back to 3600
        response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": 'success', "Content": null });
        return true;
    }
    const check = await send.send_html('index.html', response, 200, async (data) => {
        data = await utils.replace_all_templates(request, response, 1);
        data = utils.show_page(data, "register_div");
        return data;
    })
    return check;
}

async function home(request, response) {
    var [keys, values] = modules.get_cookies(request);
    const valid_token = await utils.check_for_invalid_token(request, response, keys, values);
    if (request.url === '/' && !keys?.includes('token'))
        return await login(request, response);
    const code = request.query.code;
    if (code != undefined && !request.url.includes('&state=')) {
        const google_return = await encrypt_google(code);
        if (google_return < 0)
            return `1_${google_return}`;
        modules.set_cookie(response, 'token', google_return.token, 3600);
        modules.set_cookie(response, 'lang', google_return.lang, 3600);
        response.redirect("https://localhost/");
    } else if (request.url !== '/') {
        console.log("-------------------------")
        const github_return = await utils.encrypt_github(request, response);
        if (github_return < 0)
            return `2_${github_return}`;
        modules.set_cookie(response, 'token', github_return.token, 3600);
        modules.set_cookie(response, 'lang', github_return.lang, 3600);
        console.log("-------------------------")
        response.redirect("https://localhost/");
    }
    const check = await send.send_html('index.html', response, 200, async (data) => {
        data = await utils.replace_all_templates(request, response);
        data = utils.show_page(data, "home_div");
        return data;
    });
    if (!check || check === undefined || check == false)
        return `3_${check}`
    return true;
}

async function mfa(request, response) {
    if (request.method == 'POST') {
        const [keys, values] = modules.get_cookies(request);
        var user_encrypted;
        try {
            user_encrypted = await modules.get_jwt(values[keys.indexOf('token')]);
        } catch (err) {
            response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid decoded'});
            return true;
        }
        const data = request.body;
        const userid = user_encrypted.userid;
        if (!userid || userid === undefined || userid < 0)
            return `1_${userid}`;
        if (data.Function == 'create_otc') {
            const otc_return = await utils.create_otc(userid, response);
            console.log(otc_return);
            if (!otc_return || otc_return === undefined || otc_return < 0)
                return `2_${otc_return}`;
            return true;
        } else if (data.Function == 'verify_otc') {
            var verified = await utils.verify_otc(request, response, data, userid);
            console.log(verified);
            if (verified && verified !== undefined && !(verified < 0)) {
                const check_mfa = await mfa_db.get_mfa_value('self', userid);
                var new_otc_str = check_mfa.otc;
                if (new_otc_str.endsWith('_temp'))
                    new_otc_str = new_otc_str.slice(0, -5);
                await mfa_db.update_mfa_value('otc', new_otc_str, userid);
                if (check_mfa.prefered === 0)
                    await mfa_db.update_mfa_value('prefered', 2, userid);
                response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": "success", "Content": null});
            }
            else
                response.code(401).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": "failed", "Content": null});
            return true;
        } else if (data.Function == 'create_custom') {
            return await utils.create_custom_code(userid, response, data);
        } else if (data.Function == 'verify_function') {
            return await utils.verify_custom_code(userid, response, data);
        } else if (data.Function == 'create_email') {
            return await utils.create_email_code(userid, response, data);
        } else if (data.Function == 'verify_email') {
            return await utils.verify_email_code(userid, response, data);
        } else if (data.Function == 'remove_custom_code') {
            const clear_return = await utils.clear_settings_mfa(userid, 'custom', response);
            if (!clear_return || clear_return === undefined || clear_return < 0)
                return `3_${clear_return}`;
            return true;
        } else if (data.Function === 'remove_otc') {
            const clear_return = await utils.clear_settings_mfa(userid, 'otc', response);
            if (!clear_return || clear_return === undefined || clear_return < 0)
                return `4_${clear_return}`;
            return true;
        } else if (data.Function === 'remove_email') {
            const clear_return = await utils.clear_settings_mfa(userid, 'email', response);
            if (!clear_return || clear_return === undefined || clear_return < 0)
                return `5_${clear_return}`;
            return true;
        }
    }
    const status = await send.send_html('settings.html', response, 200, async (data) => {
        data = await utils.replace_all_templates(request, response);
        data = utils.show_page(data, "mfa_div");
        return data.replace("{{mfa-button}}", data);
    });
    if (!status || status === undefined || status < 0 || status == false)
        return `7_${status}`;
    return true;
}


async function user(request, response, userid, lang) {
    const data = request.body;
    if (request.method == 'POST') {
        if (data.Function == "change_language") {
            const new_lang = data.Lang;
            const old_lang = lang;
            const new_lang_decrypted = await modules.create_jwt(new_lang, '1h');
            modules.set_cookie(response, 'lang', new_lang_decrypted, 3600);
            await settings_db.update_settings_value('lang', new_lang, userid);
            const new_page = await translator.cycle_translations(data.Page, new_lang, old_lang);
            response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'success', 'Content': new_page}); // 'Content': data.Page
            return true;
        }
        if (data.Function == "change_language_site") {
            response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'success', 'Content': data.Page}); // 'Content': data.Page
            return true;
        }
    }
    const status = await send.send_html('settings.html', response, 200, async  (data) => {
        data = await utils.replace_all_templates(request, response);
        data = utils.show_page(data, "user_prof_div");
        return data.replace('{{mfa-button}}', data);
    });
    if (!status || status === undefined || status < 0)
        return `_${status}`
    return true;
}

async function settings(request, response) {
    var [keys, values] = modules.get_cookies(request);
    const valid_token = await utils.check_for_invalid_token(request, response, keys, values);
    if (!keys?.includes('token'))
        return await login(request, response);
    const request_url = request.url.slice(9);
    if (request.method == "GET") {    
        const valid_routes = ["", "/mfa", "/user", "/user/change_user", "/user/change_login", "/user/change_avatar", "/user/change_user", "/language"];
        if (!valid_routes.includes(request_url))
            return await send.send_error_page("404.html", response, 404);
    }
    if (request_url.startsWith("/mfa"))
        return await mfa(request, response);
    console.log(request_url);
    if (request_url == "/user")
        return await user(request, response, valid_token.userid, valid_token.lang);

    const status = await send.send_html('settings.html', response, 200, async (data) => {
        data = await utils.replace_all_templates(request, response);
        data = utils.show_page(data, "settings_main_div");
        return data.replace('{{mfa-button}}', data);
    });
    if (!status || status === undefined || status < 0)
        return `1_${status}`
    return true;
}

async function profile(request, response) {
    var [keys, values] = modules.get_cookies(request);
    const valid_token = await utils.check_for_invalid_token(request, response, keys, values);
    if (!keys?.includes('token'))
        return await login(request, response);

    if (request.method == 'POST') {
        const user = await users_db.get_users_value('self', valid_token.userid);
        if (!user || user === undefined){
            response.code(404).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": 'fail', "Content": "No user or user undefined"});
            return true;
        }
        const settings = await settings_db.get_settings_value('self', valid_token.userid);
        if (!settings || settings === undefined){
            response.code(404).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": 'fail', "Content": "no settings or settings undefined"});
            return true;
        }
        const userid = valid_token.userid;
        var inner = request.body.innervalue;

        // if (await friends_request.get_friend_request_value(userid) === null){
        //     await friends_request.create_friend_request_value(-1, 0);
        // }
        
        inner = inner.replace('{{username}}', userid.username);
        inner = inner.replace('{{email}}', settings.email);
        inner = inner.replace('{{picture}}', settings.pfp);
        inner = inner.replace('{{status}}', ()=> {if (user.status === 1) return 'online'; else return 'offline'});
        if (await friends_request.get_friend_request_value('receiver_id', userid) != undefined)
            inner = inner.replace('{{Friends}}', await friends_request.show_accepted_friends(userid))
        else
            inner = inner.replace('{{Friends}}', '<span>No friends currenlty :\'( you lonely MF</span>');
        response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": 'success', "Content": inner});
        return true;
    }
    
    const status = await send.send_html('index.html', response, 200, async(data) => {
        data = await utils.replace_all_templates(request, response);
        data = utils.show_page(data, "profile_div");
        return data.replace('{{mfa-button}}', data);
    });
    if (!status || status === undefined || status < 0){
        return `Error rendering profile page: ${status}`;
    }
    return true;
}

async function logout(request, response, override) {
    const [keys, values] = modules.get_cookies(request);

    for (var pos = 0; pos < keys.length; pos++) {
        response.setCookie(keys[pos], '', {
            path: '/',
            httpOnly: true,
            secure: true,
            maxAge: 0
        });
    }
    if (override == undefined) {
        response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Logged out successfully' });
        return true;
    }
    
    await send.send_html('index.html', response, 200, async (data) => {
        data = await utils.replace_all_templates(request, response, 1);
        data = utils.show_page(data, "login_div");
        return data;
    });
}

async function update_settings(request, response) {
    if (request.method !== 'POST'){
        return send.send_error_page('404.html', response, 404);
    }
    const data = request.body;
    if (!data || data === undefined){
        return response.code(400).send({ message: 'Invalid data'});
    }
    const [keys, values] = modules.get_cookies(request);
    if (!keys?.includes('token')) {
        return login(request, response);
    }

    const { email, password, avatar } = data;

    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    }
    catch (err) {
        return // Here was a redirect(response, '/login', 302);
    }
    const userid = decoded.userid;

    let result;

    try {
        if (email){
            result = await settings_db.update_settings_value('email', email, userid);
        }
        if (password){
            result = await settings_db.update_settings_value('password', password, userid);
        }
        if (avatar){
            result = await settings_db.update_settings_value('pfp', avatar, userid);
        }
        if (result) {
            return response.code(200).send({ message: 'Successfully updated Username'});
        }
        else{
            return response.code(500).send({ message: 'Failed to update Username'});
        }
    }
    catch (err){
        console.error("Error regarding updating user: " + err);
        return response.code(500).send({ message: 'Server error'});
    }

    return;
}

async function update_user(request, response) {
    const data = request.body;
    
    const trans_file = await fs.readFile('./translations.json', 'utf8');
    const forbidden_names = ['Login', 'Register', 'Settings', 'Logout', 'Sign in with Google', 'Already have an account? Log in', 'Sign up with Github', 'Sign up with Google', 'Sign in with Github', 'Dont have an account? Create one', '404 - Page Not Found', 'The page you were looking for does not exist', 'Upload file', 'Submit', 'Repeat Password', 'Password', 'E-Mail', 'Play', 'Profile', 'Log Out', 'Sign up', 'PvE', '1v1 Mathmaking', 'Tournament', 'Tournaments', 'Search for an opponent', 'Searching for an opponent', 'Cancel Search', 'Join by code', 'Join', 'Create Tournament', 'Waiting for players', 'Copy', 'START', 'READY', 'Leave', 'Customization', 'Username', 'email', 'win/loss', 'elo', 'status', 'Match History', 'opponent', 'final score', 'date', 'Change username', 'Change login info', 'Change avatar', 'Welcome home user', 'Welcome', 'Change language', 'Choose a default authentication method', 'Disable email authentication', 'Create custom 6 diggit code', 'Create OTC', 'Recreate custom 6 diggit code', 'Remove custom 6 digit code', 'Regenerate OTC', 'Remove OTC', 'Otc', 'Custom', 'Enable email authentication', 'Change User Information', 'Choose your main language', 'Next', 'Create your 2FA custom', '6 diggit code', 'Create your 2FA custom 6 diggit code', 'Verify your 2FA custom 6 diggit code', 'Verify', 'Input your Email code', 'Input your OTC code from your authenticator app', 'Input your Custom code', 'Friends', 'Blocked Users', 'MFA', 'User', 'Home', 'Back', 'Delete account', 'Change login data'];
    // const forbidden_names_translated = 
    if (data === null || data === undefined){
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid data'});
        return true;
    }
    if (trans_file.includes(data)) {
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid data'});
    }
    const [keys, values] = modules.get_cookies(request);
    if (!keys?.includes('token'))
        return await login(request, response);

    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    }
    catch (err) {
        return // Here was a redirect(response, '/login', 302);
    }

    const userid = decoded.userid;
    try {
        const result = await users_db.update_users_value('username', data, userid);
        if (result) {
            return response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": 'Successfully updated Username'});
        }
        else{
            return response.code(500).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": 'Failed to update Username'});
        }
    }
    catch (err){
        return response.code(500).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": 'Server error'});
    }
}

async function friends(request, response){
    const [keys, values] = modules.get_cookies(request);
    const valid_token = await utils.check_for_invalid_token(request, response, keys, values);
    if (!keys?.includes('token'))
        return await login(request, response);

    if (request.method == 'POST') {
        const userid = valid_token.userid;
        var inner = request.body.innervalue;
        // inner = await translator.cycle_translations(inner, decoded_lang);
        // if (await friends_request.get_friend_request_value('self', userid) != undefined)
        inner = inner.replace('{{FRIEND_REQUESTS}}', await friends_request.show_pending_requests(userid));
        response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": 'success', "Content": inner});
        return true;
    }

    const status = await send.send_html('index.html', response, 200, async(data) => {
        const [keys, values] = modules.get_cookies(request);
        const token = values[keys.indexOf("token")];
        let decoded;
        try {
            decoded = await modules.get_jwt(token);
        } catch (err) {
            console.error(`Error in profile views.js: ${err}`);
            response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid decoded'});
            return true;
        }
        const userid = decoded.userid;
        data = await utils.replace_all_templates(request, response);
        data = utils.show_page(data, 'friends_div');
        if (await friends_request.get_friend_request_value('self', userid) != undefined)
            data = data.replace('{{FRIEND_REQUESTS}}', await friends_request.show_pending_requests(userid));
        return data;
    });
    if (!status || status === undefined){
        return `Error rendering user settings page: ${status}`;
    }
    return true;
}

async function add_friends(request, response){
    const [keys, values] = modules.get_cookies(request);
    if (!keys?.includes('token')) {
        return login(request, response);
    }

    const data = request.body;
    if (!data || data === undefined){
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid data'});
        return true;
    }
    const token = values[keys.indexOf('token')];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err) {
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid decoded'});
        return true;
    }

    const userid = decoded.userid;
    const receiver = data.input_value;
    const receiver_db = await users_db.get_users_value('username', receiver);
    if (!receiver_db || receiver_db === undefined){
        console.error("no user in database");
        response.code(404).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": "no user in database" });
        return true;
    }
    if (receiver_db.self == userid){
        console.error("cant send youself the request");
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": "Sending request to self" });
        return true;
    }

    const result = await friends_request.create_friend_request_value(userid, receiver_db.self);
    if (!result || result === undefined || result < 0){
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": "Error" });
        console.error("create_friend_request_value caught an error");
        return null;
    }
    response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": "success" });
    return true;
}

async function accept_friends(request, response){
    const [keys, values] = modules.get_cookies(request);
    const data = request.body;
    if (!data || data === undefined){
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid data'});
        return true;
    }

    let decoded;
    try {
        decoded = await modules.get_jwt(values[keys.indexOf("token")]);
    } catch (err) {
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid decoded'});
        return true;
    }

    const receiver = data.userid;
    const result = await friends_request.update_friend_request_value(receiver, 'accepted');
    if (!result || result === undefined){
        console.error("error in deleting accepted friend request");
        return null;
    }
    response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'success'});
    return true;
}

async function reject_friend(request, response){
    const [keys, values] = modules.get_cookies(request);
    const data = request.body;
    if (!data || data === undefined){
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid data'});
        return true;
    }

    let self_user;
    try {
        self_user = await modules.get_jwt(values[keys.indexOf("token")]);
    } catch (err) {
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid decoded'});
        return true;
    }

    const receiver = self_user.userid;
    const result = await friends_request.delete_friend_request_value(receiver);
    if (!result || result === undefined){
        console.error("error in deleting accepted friend request");
        return null;
    }
    response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin':  '*'}).send({ message: 'success'});
    return true;
}

async function delete_account(request, response) {
    const data = request.body;
    const [keys, values] = modules.get_cookies(request);
    const token = values[keys.indexOf('token')];
    var decrypted;
    try {
        decrypted = await modules.get_jwt(token);
    } catch (err) {
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid decoded'});
        return true;
    }
    const decrypted_user = decrypted.userid;
    await settings_db.delete_settings_value(decrypted_user);
    response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": 'success'});
    return true;
}

async function play(request, response) {
    console.log("play page requested");
    const [keys, values] = modules.get_cookies(request);
    await utils.check_for_invalid_token(request, response, keys, values); 
    if (!keys?.includes('token')) {
        return await login(request, response);
    }

    // const tokenIndex = keys.findIndex((key) => key === 'token');
    // const token = values[tokenIndex];
    const token = values[keys.indexOf('token')];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err) {
        response.code(400).headers(response, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid decoded' });
        return true;
    }

    const user = await users_db.get_users_value('self', decoded.userid);
    if (!user || user === undefined){
        response.code(404).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ "Response": 'fail', "Content": "No user or user undefined" });
        return true;
    }

    const status = await send.send_html('index.html', response, 200, async(data) => {
        data = await utils.replace_all_templates(request, response);
        data = data.replace("{{uname}}", user.username);
        data = utils.show_page(data, "play_div");
        return data;
    });

    if (!status || status === undefined || status < 0){
        return `Error rendering play page: ${status}`;
    }
    return true;
}


async function set_up_mfa_buttons(request, response) {
    const [keys, values] = modules.get_cookies(request);
    if (!keys?.includes('token')) {
        return login(request, response);
    }

    const encrypted_userid = values[keys.indexOf('token')];
    var userid
    try {
        userid = await modules.get_jwt(encrypted_userid).userid;
    } catch (err) {
        response.code(400).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({ message: 'Invalid decoded'});
        return true;
    }
    var set = 0;
    var options = '';
    var parsed = await mfa_db.get_mfa_value('self', userid);
    if (parsed == undefined)
        await mfa_db.create_mfa_value('', '', '', 0, userid);
    else {
        if (parsed.otc.length !== 0 && !parsed.otc.endsWith('_temp')) {
            set++;
            options += "<option value=\"2\">OTC</option>";
        }
        if (parsed.custom.length !== 0 && !parsed.custom.endsWith('_temp')) {
            set++;
            options += "<option value=\"3\">Custom</option>";
        }
        if (parsed.email.length !== 0 && !parsed.email.endsWith('_temp')) {
            set++;
            options += "<option value=\"1\">Email</option>";
        }
    }

    var settings_html_mfa_string = "";
	settings_html_mfa_string += '<div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>';
	settings_html_mfa_string += '<div id="mfa"></div>'
    settings_html_mfa_string += '<div id="mfa-button">'

    if (set > 1){
        settings_html_mfa_string +='<div class="flex gap-2">'
        settings_html_mfa_string +='<form id="mfa_options" class="w-5/6">'
        settings_html_mfa_string +='<select name="lang" id="select_mfa" class="w-full p-4 text-center rounded-xl text-2xl border border-[#e0d35f] border-spacing-8 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f]">'
        settings_html_mfa_string +='<option value="" selected disabled hidden>Choose your main 2FA</option>'
        settings_html_mfa_string += options;
        settings_html_mfa_string +='</select></form>'
        
        settings_html_mfa_string +='<div class="flex items-center justify-center w-1/6 mb-6 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] border-black border border-spacing-5 rounded-xl cursor-pointer">'
        settings_html_mfa_string +='<button onclick="get_preferred_mfa()" id="mfa_update_btn">'
        settings_html_mfa_string +='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-16">'
        settings_html_mfa_string +='<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />'
        settings_html_mfa_string +='</svg></button></div></div>'
    }
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div class="flex gap-2">';
	settings_html_mfa_string +='<div class="buttons mb-6 w-5/6" onclick="create_otc()">';
	settings_html_mfa_string +='<button class="block w-full mb-6 mt-6">';
	settings_html_mfa_string +='<span class="button_text">Create OTC</span></button></div>';
	settings_html_mfa_string +='';
    if (options.includes("OTC"))
	    settings_html_mfa_string += utils.retrieve_trash_icon_mfa("remove_mfa('remove_otc')", true);
    else
        settings_html_mfa_string += utils.retrieve_trash_icon_mfa("remove_mfa('remove_otc')", false);
    settings_html_mfa_string +='';
	settings_html_mfa_string +='<div class="flex gap-2">';
	settings_html_mfa_string +='<div class="buttons mb-6 w-5/6" onclick="create_custom_code()">';
	settings_html_mfa_string +='<button class="block w-full mb-6 mt-6">';
	settings_html_mfa_string +='<span class="button_text">Create custom 6 digit code</span></button></div>';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='';
    if (options.includes("Custom"))
	    settings_html_mfa_string += utils.retrieve_trash_icon_mfa("remove_mfa('remove_custom_code')", true);
    else
        settings_html_mfa_string += utils.retrieve_trash_icon_mfa("remove_mfa('remove_custom_code')", false);
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div class="flex gap-2">';
	settings_html_mfa_string +='<div class="buttons mb-6 w-5/6" onclick="create_email()">';
	settings_html_mfa_string +='<button class="block w-full mb-6 mt-6">';
	settings_html_mfa_string +='<span class="button_text">Enable email authentication</span></button></div>';
	settings_html_mfa_string +='';
    if (options.includes("Email"))
	    settings_html_mfa_string += utils.retrieve_trash_icon_mfa("remove_mfa('remove_email')", true);
    else
        settings_html_mfa_string += utils.retrieve_trash_icon_mfa("remove_mfa('remove_email')", false);
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div class="flex mt-12 gap-4 w-full">';
	settings_html_mfa_string +='<a class="flex-1" href="/settings" data-link>';
	settings_html_mfa_string +='<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	settings_html_mfa_string +='<span class="font-bold text-lg">Back</span>';
	settings_html_mfa_string +='</button></a>';
	settings_html_mfa_string +='<a href="/" class="flex-1" data-link>';
	settings_html_mfa_string +='<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	settings_html_mfa_string +='<span class="font-bold text-lg">Home</span>';
	settings_html_mfa_string +='</button></a></div></div></div></div></div>';
    return response.code(200).headers({'Content-Type': 'application/json','Access-Control-Allow-Origin': '*'}).send({"Response": "success","Content": settings_html_mfa_string});
}

async function check_preferred_mfa(request, response){
    const data = request.body;
    const userid = data.Userid;
    if (!userid || userid === undefined || userid < 0)
        return `1_${userid}`;
    if (data.Function == 'verify_otc') {
        console.log("verify OTC");
        var verified = await utils.verify_otc(request, response, data, userid);
        console.log("verified OTC");
        console.log(verified);
        if (verified && verified !== undefined && !(verified < 0)) {
            const check_mfa = await mfa_db.get_mfa_value('self', userid);
            var new_otc_str = check_mfa.otc;
            if (new_otc_str.endsWith('_temp'))
                new_otc_str = new_otc_str.slice(0, -5);
            await mfa_db.update_mfa_value('otc', new_otc_str, userid);
            if (check_mfa.prefered === 0)
                await mfa_db.update_mfa_value('prefered', 2, userid);
            response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": "success", "Content": null});
        }
        else
            response.code(401).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": "failed", "Content": null});
        return true;
    }
    else if (data.Function == 'verify_function') {
        return await utils.verify_custom_code(userid, response, data);
    }
    else if (data.Function == 'verify_email') {
        console.log("/////////////////////////////////");
        return await utils.verify_email_code(userid, response, data);
    }
    return true;
}

async function change_preferred_mfa(request, response){
    const [keys, values] = modules.get_cookies(request);
    if (!keys?.includes('token')) {
        return login(request, response);
    }

    const token = values[keys.indexOf('token')];

    const userid = await modules.get_jwt(token).userid;
    const data = request.body.Value;
    const status = await mfa_db.update_mfa_value('prefered', data, userid);
    if (!status || status == undefined){
        response.code(401).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": "failed", "Content": null});
        return true;
    }
    response.code(200).headers({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}).send({"Response": "success", "Content": null});
    return true;
}


export {
    login,
    register,
    settings,
    mfa,
    home,
    profile,
    logout,
    update_user,
    update_settings,
    friends,
    add_friends,
    accept_friends,
    reject_friend,
    delete_account,
    play,
    set_up_mfa_buttons,
    check_preferred_mfa,
    change_preferred_mfa
}