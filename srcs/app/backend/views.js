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
import { encrypt_google } from './utils.js';
import http from 'http';

async function login(request, response) {
    var [keys, values] = modules.get_cookies(request);
    if (keys?.includes('token'))
        return await home(request, response);
    if (request.method === "POST") {
        const parsed = await utils.process_login(request, response);
        if (!parsed || parsed === undefined || parsed < 0)
            return true;
        const token = modules.create_jwt(parsed.settings.self, '1h');
        const lang = modules.create_jwt(parsed.settings.lang, '1h');

        modules.set_cookie(response, 'token', token, true, true, 'strict');
        modules.set_cookie(response, 'lang', lang, true, true, 'strict');

        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'success', "Settings": parsed.settings, "Mfa": parsed.mfa, "Content": null}));
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
            response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.raw.end(JSON.stringify({"Response": 'User already exists', "Content": null}));
            return true;
        }
        if (replace_data.password.length > 71) {
            response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.raw.end(JSON.stringify({"Response": 'Password to long', "Content": null}));
            return true;
        }
        const hashed = await modules.create_encrypted_password(replace_data.password);
        if (!hashed || hashed === undefined || hashed < 0) {
            response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.raw.end(JSON.stringify({"Response": 'Bcrypt error', "Content": null}));
            return true;
        }
        const settings = await settings_db.create_settings_value(hashed, '', 0, replace_data.email, 'en', '', '');
        if (!settings || settings === undefined || settings < 0) {
            response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.raw.end(JSON.stringify({"Response": 'Failed creating table in settings', "Content": null}));
            return true;
        }
        const user = await users_db.create_users_value(0, replace_data.username, settings.self);
        if (!user || user === undefined || user < 0) {
            await settings_db.delete_settings_value(settings.self);
            response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.raw.end(JSON.stringify({"Response": 'Failed creating table in user', "Content": null}));
            return true;
        }
        const token = modules.create_jwt(settings.self, '1h');
        const lang = modules.create_jwt(settings.lang, '1h');
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
        modules.set_cookie(response, 'lang', lang, true, true, 'strict');
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'success', "Content": null}));
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
        const github_return = await utils.encrypt_github(request, response);
        if (github_return < 0)
            return `2_${github_return}`;
        modules.set_cookie(response, 'token', github_return.token, 3600);
        modules.set_cookie(response, 'lang', github_return.lang, 3600);
        response.redirect("https://localhost/");
    }
    const check = await send.send_html('index.html', response, 200, async (data) => {
        data = await utils.replace_all_templates(request, response);
        // data = utils.show_page(data, "home_div");//changed from register to home?
        data = utils.show_page(data, "register_div");//changed from register to home?
        return data;
    });
    if (!check || check === undefined || check == false)
        return `3_${check}`
    return true;
}

async function mfa(request, response) {
    if (request.method === "POST") {
        const data = request.body;
        const userid = await utils.get_decrypted_userid(request, response);
        if (!userid || userid === undefined || userid < 0)
            return `1_${userid}`;
        if (data.Function == 'create_otc') {
            const otc_return = await utils.create_otc(userid, response);
            if (!otc_return || otc_return === undefined || otc_return < 0)
                return `2_${otc_return}`;
            return true;
        } else if (data.Function == 'verify_otc') {
            response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            var verified = await utils.verify_otc(request, response, data, null);
            console.log(verified);
            if (verified && verified !== undefined && !(verified < 0)) {
                const check_mfa = await mfa_db.get_mfa_value('self', userid);
                var new_otc_str = check_mfa.otc;
                if (new_otc_str.endsWith('_temp'))
                    new_otc_str = new_otc_str.slice(0, -5);
                await mfa_db.update_mfa_value('otc', new_otc_str, userid);
                if (check_mfa.prefered === 0)
                    await mfa_db.update_mfa_value('prefered', 2, userid);
                response.raw.end(JSON.stringify({"Response": "success"}));
            }
            else
                response.raw.end(JSON.stringify({"Response": "failed"}));
            return true;
        } else if (data.Function == 'create_custom') {
            return await utils.create_custom_code(userid, response, data);
        } else if (data.Function == 'verify_function') {
            return await utils.verify_custom_code(userid, response, data);
        } else if (data.Function == 'create_email') {
            const returned2 = await utils.create_email_code(userid, response, data);
            return returned2;
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
        const userid = await utils.get_decrypted_userid(request, response);
        if (userid === -1)
            return // Here was a redirect(response, '/login', 302);
        else if (userid === -2)
            return true;
        const check_mfa = await mfa_db.get_mfa_value('self', userid);
        if (check_mfa === undefined || check_mfa === null){
            var replace_string = "";
            replace_string += '<div class="buttons mb-6" onclick="create_otc()">';
            replace_string += '<button class="block w-full mb-6 mt-6">';
            replace_string += '<span class="button_text">Create OTC</span>';
            replace_string += '</button></div>';
            replace_string += '<div class="buttons mb-6" onclick="create_custom_code()">';
            replace_string += '<button class="block w-full mb-6 mt-6">';
            replace_string += '<span class="button_text">Create custom 6 diggit code</span>';
            replace_string += '</button></div>';
            replace_string += '<div class="buttons mb-6" onclick="create_email()">';
            replace_string += '<button class="block w-full mb-6 mt-6">';
            replace_string += '<span class="button_text">Enable email authentication</span>';
            replace_string += '</button></div>';
            replace_string += '<div class="flex mt-12 gap-4 w-full">';
            replace_string += '<a class="flex-1" href="/settings" data-link>';
            replace_string += '<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
            replace_string += '<span class="font-bold text-lg">Back</span>';
            replace_string += '</button></a>';
            replace_string += '<a class="flex-1">';
            replace_string += '<button onclick="logout()" class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
            replace_string += '<span class="font-bold text-lg">Logout</span>';
            replace_string += '</button></a></div>';
            return data.replace("{{mfa-button}}", replace_string);
        }
        var replace_string = "";
        var select_number = 0;
        var select_menu = "";
        if (check_mfa.otc.length !== 0 && !check_mfa.otc.endsWith('_temp')) {
            replace_string += '<button onclick="create_otc()">Regenerate OTC</button> ';
            replace_string += '<button onclick="remove_otc()">Remove OTC</button> ';
            select_number++;
            select_menu += '<option value="otc">Otc</option>';
        } else
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_otc()"><span class="button_text">Create OTC</span></button></div> ';
        if (check_mfa.custom.length !== 0 && !check_mfa.custom.endsWith('_temp')) {
            replace_string += '<button onclick="create_custom_code()">Recreate custom 6 diggit code</button> ';
            replace_string += '<button onclick="remove_custom_code()">Remove custom 6 digit code</button> ';
            select_number++;
            select_menu += '<option value="custom">Custom</option>';
        } else
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_custom_code()"><span class="button_text">Create custom 6 diggit code</span></button></div> ';
        if (check_mfa.email.length !== 0 && !check_mfa.email.endsWith('_temp')) {
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="remove_email()"><span class="button_text">Disable email authentication</span></button></div> ';
            select_number++;
            select_menu += '<option value="email">Email</option>';
        } else
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_email()"><span class="button_text">Enable email authentication</span></button></div> ';
        if (select_number < 2)
            return data.replace("{{mfa-button}}", `${replace_string} <a href="/" data-link><button>Back</button></a> \
                <button onclick="logout()">Logout</button>`);
        select_menu = `
        <form id="mfa_select_form">
            <select name="mfa" id="mfa">
                <option value="" selected disabled hidden>Choose a default authentication method</option>
                    ${select_menu}
            </select>
            <button type="submit">Submit</button>
        </form>
        <br>`;
        return data.replace("{{mfa-button}}", `${replace_string} ${select_menu} <div><a href="/settings" data-link><button>Back</button></a></div> \
        <button onclick="logout()">Logout</button>`);
    });
    if (!status || status === undefined || status < 0 || status == false)
        return `7_${status}`;
    return true;
}

async function settings(request, response) {
    var [keys, values] = modules.get_cookies(request);
    if (!keys?.includes('token'))
        return login(request, response);// Here was a redirect(response, '/login', 302);
    const request_url = request.url.slice(9);
    if (request_url.startsWith("/mfa?"))
        return await settings_set_prefered_mfa(request, response);
    if (request_url == "/mfa")
        return await mfa(request, response);
    if (request_url.startsWith("/user?"))
        return await settings_prefered_language(request, response);
    if (request_url.startsWith("/user"))
        return await user(request, response);

    const status = await send.send_html('settings.html', response, 200, async  (data) => {
        var replace_string = "<span>In here??????</span>";
        // replace_string += '<div><a href="/settings/mfa" data-link><div class="buttons mb-6"></a></div>';
        // replace_string += '<button class="block w-full mb-6 mt-6">';
        // replace_string += '<span class="button_text">MFA</span>';
        // replace_string += '</button></div>';

        // replace_string += '<div><a href="/settings/user" data-link><div class="buttons mb-6"></a></div>';
        // replace_string += '<button class="block w-full mb-6 mt-6">';
        // replace_string += '<span class="button_text">User</span>';
        // replace_string += '</button></div>';

        // replace_string += '<div class="flex mt-12 gap-4 w-full">';
        // replace_string += '<a class="flex-1" href="/" data-link>';
        // replace_string += '<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
        // replace_string += '<span class="button_text">Back</span>';
        // replace_string += '</button></a>';
        // replace_string += '<a class="flex-1">';
        // replace_string += '<button onclick="logout()" class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
        // replace_string += '<span class="button_text">Logout</span>';
        // replace_string += '</button></a></div>';
        return data.replace('{{mfa-button}}', replace_string);
    });
    if (!status || status === undefined || status < 0)
        return `_${status}`
    return true;
}

async function settings_set_prefered_mfa(request, response) {
    if (request.url.length < 11)
        return // Here was a redirect(response, '/settings/mfa', 302);
    const location = request.url.slice(10);
    if (!location.indexOf('='))
        return // Here was a redirect(response, '/settings/mfa', 302);
    const pos = location.indexOf('=') + 1;
    if (location.length === pos)
        return // Here was a redirect(response, '/settings/mfa', 302);
    const method = location.slice(pos);
    const {keys, values} = utils.get_cookie('token', request);
    if ((!keys && !values) || (keys === undefined && values === undefined))
        return // Here was a redirect(response, '/settings/mfa', 302);
    const decrypted_user =  modules.get_jwt(values[0]);
    const userid = decrypted_user.userid;
    const check_mfa = await mfa_db.get_mfa_value('self', userid);
    if (!check_mfa || check_mfa === undefined)
        return // Here was a redirect(response, '/settings/mfa', 302);
    if (method === 'email') {
        await mfa_db.update_mfa_value('prefered', 1, userid);
    } else if (method === 'otc') {
        await mfa_db.update_mfa_value('prefered', 2, userid);
    } else if (method === 'custom') {
        await mfa_db.update_mfa_value('prefered', 3, userid);
    }
    return // Here was a redirect(response, '/settings/mfa', 302);    
}

async function settings_prefered_language(request, response) {
    if (request.url.length < 11)
        return // Here was a redirect(response, '/settings/user', 302);
    const location = request.url.slice(10);
    if (!location.indexOf('='))
        return // Here was a redirect(response, '/settings/user', 302);
    const pos = location.indexOf('=') + 1;
    if (location.length === pos)
        return // Here was a redirect(response, '/settings/user', 302);
    const method = location.slice(pos);
    var [keys, values] = modules.get_cookies(request.headers.cookie);
    const user_check = keys?.find((key) => key === 'token');
    if (!user_check || user_check === undefined || user_check == false)
        return false;
    const userIndex = keys.indexOf('token');
    var user = values[userIndex];
    user = modules.get_jwt(user);
    const lang_check = keys?.find((key) => key === 'lang');
    if (!lang_check || lang_check === undefined || lang_check == false)
        return false;
    const langIndex = keys.indexOf('lang');
    var lang = values[langIndex];
    lang = modules.get_jwt(lang);
    if (lang.userid == method)
        return // Here was a redirect(response, '/settings/user', 302);
    const lang_jwt = modules.create_jwt(method, '1h');
    if (!lang_jwt || lang_jwt == undefined || lang_jwt < 0)
        return // Here was a redirect(response, '/settings/user', 302);
    modules.delete_cookie(response, 'lang');
    modules.set_cookie(response, 'lang', lang_jwt);
    const wow = await settings_db.update_settings_value('lang', method, user.userid);
    return // Here was a redirect(response, '/settings/user', 302);
}

async function verify_email(request, response) {
    if (request.method !== 'POST')
        return await send.send_error_page('404.html', response, 404);
    const frontend_data = await utils.get_frontend_content(request);
    if (!frontend_data || frontend_data === undefined || frontend_data < 0)
        return false;
    const check_mfa = await mfa_db.get_mfa_value('self', frontend_data.userid);
    if (!check_mfa || check_mfa === undefined || check_mfa.email.length === 0 || check_mfa.email.endsWith('_temp'))
        return false;
    const valid_password = await modules.check_encrypted_password(frontend_data.code, check_mfa.email);
    if (!valid_password || valid_password === undefined || valid_password < 0) {
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = modules.create_jwt(frontend_data.userid, '1h');
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'reload', "Content": null}));
    }
    return true;
}

async function verify_2fa(request, response) {
    if (request.method !== 'POST')
        return await send.send_error_page('404.html', response, 404);
    const frontend_data = await utils.get_frontend_content(request);
    if (!frontend_data || frontend_data === undefined || frontend_data < 0)
        return false;
    const replace_data = {'Function': 'verify', 'Code': frontend_data.code};
    const temp = await utils.verify_otc(request, response, replace_data, frontend_data.userid);
    if (temp === false || !temp || temp === undefined || temp < 0) {
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = modules.create_jwt(frontend_data.userid, '1h');
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'reload', "Content": null}));
    }
    return true;
}

async function verify_custom(request, response) {
    if (request.method !== 'POST')
        return await send.send_error_page('404.html', response, 404);
    const frontend_data = await utils.get_frontend_content(request);
    if (!frontend_data)
        return false;
    const replace_data = {'Function': 'verify', 'Code': frontend_data.code};
    const temp = await utils.verify_custom_code(frontend_data.userid, response, replace_data);
    if (temp === false) {
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = modules.create_jwt(frontend_data.userid, '1h');
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'reload', "Content": null}));
    }
    return true;
}

async function profile(request, response){
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')){ 
        return // Here was a redirect(response, '/login', 302);
    }
    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err){
        return // Here was a redirect(response, '/login', 302);
    }

    const user = await users_db.get_users_value('self', decoded.userid);
    if (!user || user === undefined){
        return send.send_error_page('404.html', response, 404);
    }

    const settings = await settings_db.get_settings_value('self', decoded.userid);
    if (!settings || settings === undefined){
        return send.send_error_page('404.html', response, 404);
    }

    const userid = decoded.userid;

    const status = await send.send_html('index.html', response, 200, async(data) => {
        var [keys, values] = modules.get_cookies(request.headers.cookie);
        const lang_check = keys?.find((key) => key === 'lang');
        if (!lang_check || lang_check === undefined || lang_check == false)
            return false;
        const langIndex = keys.indexOf('lang');
        const lang = values[langIndex];
        try {
            var decoded_lang = modules.get_jwt(lang);
        } catch (err) {
            return false;
        }
        data = await utils.replace_all_templates(request, response);
        data = utils.show_page(data, "profile_div");
        data = await translator.cycle_translations(data, decoded_lang.userid);
        data = data.replace('{{username}}', user.username);
        data = data.replace('{{email}}', settings.email || 'Not provided');
        data = data.replace('{{picture}}', settings.pfp || 'public/default_profile.svg');
        data = data.replace('{{status}}', ()=> {if (user.status === 1) return 'online'; else return 'offline'});
        data = data.replace('{{Friends}}', await friends_request.show_accepted_friends(userid))
        return data;
    });

    if (!status || status === undefined || status < 0){
        return `Error rendering profile page: ${status}`;
    }
    return true;
}

async function logout(request, response) {
    const [keys, values] = modules.get_cookies(request);
    if (!keys?.includes('token')) {
        return;
    }

    for (var pos = 0; pos < keys.length; pos++) {
        response.setCookie(keys[pos], '', {
            path: '/',
            httpOnly: true,
            secure: true,
            maxAge: 0
        });
    }
    response.code(200).send({ message: 'Logged out successfully' });
}


async function user_settings(request, response) {
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return // Here was a redirect(response, '/login', 302);
    }

    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err) {
        return // Here was a redirect(response, '/login', 302);
    }

    const status = await send.send_html('user_settings.html', response, 200);
    if (!status || status === undefined){
        return `Error rendering user settings page: ${status}`;
    }
    return true;
}



async function update_settings(request, response) {
    if (request.method !== 'POST'){
        return send.send_error_page('404.html', response, 404);
    }
    const data = request.body;
    if (!data || data === undefined){
        return response.code(400).send({ message: 'Invalid data'});
    }
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return // Here was a redirect(response, '/login', 302);
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
    if (request.method !== 'POST') {
        return send.send_error_page('404.html', response, 404);
    }

    const data = request.body;
    if (data === null || data === undefined){
        return response.code(400).send({ message: 'Invalid data'});
    }
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return // Here was a redirect(response, '/login', 302);
    }

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
        const result = await users_db.update_users_value('username', data.usernameValue, userid);
        if (result) {
            return response.code(200).send({ message: 'Successfully updated Username'});
        }
        else{
            return response.code(500).send({ message: 'Failed to update Username'});
        }
    }
    catch (err){
        return response.code(500).send({ message: 'Server error'});
    }
}

async function friends(request, response){
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return // Here was a redirect(response, '/login', 302);
    }

    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err) {
        return // Here was a redirect(response, '/login', 302);
    }

    const userid = decoded.userid;

    const status = await send.send_html('index.html', response, 200, async(data) => {
        var [keys, values] = modules.get_cookies(request.headers.cookie);
        const lang_check = keys?.find((key) => key === 'lang');
        if (!lang_check || lang_check === undefined || lang_check == false)
            return false;
        const langIndex = keys.indexOf('lang');
        const lang = values[langIndex];
        try {
            var decoded_lang = modules.get_jwt(lang);
        } catch (err) {
            return false;
        }
        data = await translator.cycle_translations(data, decoded_lang.userid);
        data = data.replace('{{FRIEND_REQUESTS}}', await friends_request.show_pending_requests(userid));
        return data;
    });




    // const status = await send.send_html('friends.html', response, 200);
    // if (!status || status === undefined){
    //     return `Error rendering user settings page: ${status}`;
    // }
    return true;
}


async function add_friends(request, response){
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return // Here was a redirect(response, '/login', 302);
    }

    const data = request.body;
    if (!data || data === undefined){
        return response.code(400).send({ message: 'Invalid data'});
    }
    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err) {
        return // Here was a redirect(response, '/login', 302);
    }

    const userid = decoded.userid;

    const receiver = data.input_value;
    const receiver_db = await users_db.get_users_value('username', receiver);
    if (!receiver_db || receiver_db === undefined){
        console.error("no user in database");
        return;
    }

    const result = await friends_request.create_friend_request_value(userid, receiver_db.self);
    if (!result || result === undefined){
        console.error("create_friend_request_value caught an error");
        return null;
    }
    return true;
}

async function accept_friend(request, response){
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return // Here was a redirect(response, '/login', 302);
    }

    const data = request.body;
    if (!data || data === undefined){
        return response.code(400).send({ message: 'Invalid data'});
    }
    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err) {
        return // Here was a redirect(response, '/login', 302);
    }

    // const userid = decoded.userid;

    const receiver = data.userid;
    // const result = await friends_request.delete_friend_request_value(receiver);
    const result = await friends_request.update_friend_request_value(receiver, 'accepted');
    if (!result || result === undefined){
        console.error("error in deleting accepted friend request");
        return null;
    }
    return true;
}

async function reject_friend(request, response){
const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return // Here was a redirect(response, '/login', 302);
    }

    const data = request.body;
    if (!data || data === undefined){
        return response.code(400).send({ message: 'Invalid data'});
    }
    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err) {
        return // Here was a redirect(response, '/login', 302);
    }

    // const userid = decoded.userid;

    const receiver = data.userid;
    console.log("RECEIVER: ", receiver);
    const result = await friends_request.delete_friend_request_value(receiver);
    if (!result || result === undefined){
        console.error("error in deleting accepted friend request");
        return null;
    }
    return true;
}


async function block_friend(request, response){
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return // Here was a redirect(response, '/login', 302);
    }

    const data = request.body;
    if (!data || data === undefined){
        return response.code(400).send({ message: 'Invalid data'});
    }
    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err) {
        return // Here was a redirect(response, '/login', 302);
    }

    // const userid = decoded.userid;

    const receiver = data.userid;
    // const result = await friends_request.delete_friend_request_value(receiver);
    const result = await friends_request.update_friend_request_value(receiver, 'blocked');
    if (!result || result === undefined){
        console.error("error in deleting accepted friend request");
        return null;
    }
    return true;
}

async function field_login(request, reply){
    const googleHref = utils.google_input_handler();
    const githubHref = utils.github_input_handler();
    let return_login = ``;
    return_login += `<label for="email-input" class="label_text">Email</label>`;
    return_login += `<div class="relative">`;
    return_login += `<div class="input_svg">`;
    return_login += `<svg class="w-6 h-6 text-gray-500 justify-center" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 16">`;
    return_login += `<path d="m10.036 8.278 9.258-7.79A1.979 1.979 0 0 0 18 0H2A1.987 1.987 0 0 0 .641.541l9.395 7.737Z"/>`;
    return_login += `<path d="M11.241 9.817c-.36.275-.801.425-1.255.427-.428 0-.845-.138-1.187-.395L0 2.6V14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2.5l-8.759 7.317Z"/>`;
    return_login += `</svg>`;
    return_login += `</div>`;
    return_login += `<input type="text" id="email-input_LogIn" placeholder="example@gmail.com" required class="input_field" />`;
    return_login += `</div>`;
    return_login += `<label for="password-input" class="label_text">Password</label>`;
    return_login += `<div class="relative">`;
    return_login += `<div class="input_svg">`;
    return_login += `<svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">`;
    return_login += `<path fill-rule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clip-rule="evenodd" />`;
    return_login += `</svg>`;
    return_login += `</div>`;
    return_login += `<button onclick="toggle_Eye(3)" id="password_eye1" class="password_eye" tabindex="-1">`;
    return_login += `<svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">`;
    return_login += `<path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />`;
    return_login += `<path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />`;
    return_login += `<path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" />`;
    return_login += `</svg>`;
    return_login += `</button>`;
    return_login += `<input type="password" id="password-input_LogIn" placeholder="Password" required class="input_field" />`;
    return_login += `</div>`;
    return_login += `<button id="login-button" onclick="login()" class="mt-4 bg-violet-700 hover:bg-violet-800 text-white font-bold py-2 text-lg rounded-xl w-full mb-4 transition-all">`;
    return_login += `Login`;
    return_login += `</button>`;
    return_login += `<div class="w-full mt-4 space-y-4">`;
    return_login += `<a id="google" href="${googleHref}">`;
    return_login += `<button type="button" class="text-white bg-[#1973e7] font-medium rounded-xl text-lg px-5 py-2.5 w-full flex items-center justify-center gap-4 border">`;
    return_login += `<svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">`;
    return_login += `<path fill="#fbc02d" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#e53935" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4caf50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1565c0" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>`;
    return_login += `</svg>`;
    return_login += `<span>Sign in with Google</span>`;
    return_login += `</button>`;
    return_login += `</a>`;
    return_login += `<a id="github" href="${githubHref}">`;
    return_login += `<button type="button" class="text-white bg-[#221f1f] font-medium rounded-xl text-lg px-5 py-2.5 w-full flex items-center justify-center gap-4 border mt-2">`;
    return_login += `<svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">`;
    return_login += `<g fill="#ffffff" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(8.53333,8.53333)"><path d="M15,3c-6.627,0 -12,5.373 -12,12c0,5.623 3.872,10.328 9.092,11.63c-0.056,-0.162 -0.092,-0.35 -0.092,-0.583v-2.051c-0.487,0 -1.303,0 -1.508,0c-0.821,0 -1.551,-0.353 -1.905,-1.009c-0.393,-0.729 -0.461,-1.844 -1.435,-2.526c-0.289,-0.227 -0.069,-0.486 0.264,-0.451c0.615,0.174 1.125,0.596 1.605,1.222c0.478,0.627 0.703,0.769 1.596,0.769c0.433,0 1.081,-0.025 1.691,-0.121c0.328,-0.833 0.895,-1.6 1.588,-1.962c-3.996,-0.411 -5.903,-2.399 -5.903,-5.098c0,-1.162 0.495,-2.286 1.336,-3.233c-0.276,-0.94 -0.623,-2.857 0.106,-3.587c1.798,0 2.885,1.166 3.146,1.481c0.896,-0.307 1.88,-0.481 2.914,-0.481c1.036,0 2.024,0.174 2.922,0.483c0.258,-0.313 1.346,-1.483 3.148,-1.483c0.732,0.731 0.381,2.656 0.102,3.594c0.836,0.945 1.328,2.066 1.328,3.226c0,2.697 -1.904,4.684 -5.894,5.097c1.098,0.573 1.899,2.183 1.899,3.396v2.734c0,0.104 -0.023,0.179 -0.035,0.268c4.676,-1.639 8.035,-6.079 8.035,-11.315c0,-6.627 -5.373,-12 -12,-12z"></path></g></g>`;
    return_login += `</svg>`;
    return_login += `<span>Sign in with GitHub</span>`;
    return_login += `</button>`;
    return_login += `</a>`;
    return_login += `</div>`;
    return reply.code(200).send({ "response": return_login });
}

async function field_signup(request, reply){
    const googleHref = utils.google_input_handler();
    const githubHref = utils.github_input_handler();
    let return_signup = `
    <label for="username_SignUp" class="label_text">Username</label>
    <div id="user_field" class="relative input_total">
    <div class="input_svg">
    <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
    <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" /></svg></div>
    <input type="text" id="username_SignUp" placeholder="Username" required class="input_field" /></div>
    <label for="email_SignUp" class="label_text">Email</label>
    <div id="email_field" class="relative input_total">
    <div class="input_svg">
    <svg class="w-6 h-6 text-gray-500 justify-center" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 16">
    <path d="m10.036 8.278 9.258-7.79A1.979 1.979 0 0 0 18 0H2A1.987 1.987 0 0 0 .641.541l9.395 7.737Z"/>
    <path d="M11.241 9.817c-.36.275-.801.425-1.255.427-.428 0-.845-.138-1.187-.395L0 2.6V14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2.5l-8.759 7.317Z"/></svg></div>
    <input type="text" id="email_SignUp" placeholder="example@gmail.com" required class="input_field" /></div>
    <label for="password-input_SignUp" class="label_text">Password</label>
    <div id="password_field" class="relative input_total">
    <div class="input_svg">
    <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
    <path fill-rule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clip-rule="evenodd" /></svg></div>
    <button onclick="toggle_Eye(1)" id="password_eye" class="password_eye" tabindex="-1">
    <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
    <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
    <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />
    <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" /></svg></button>
    <input type="password" id="password-input_SignUp" placeholder="Password" required class="input_field" />
    </div>
    <label for="password-input2_SignUp" class="label_text">Repeat Password</label>
    <div id="repeat_field" class="relative input_total">
    <div class="input_svg">
    <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
    <path fill-rule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clip-rule="evenodd" /></svg></div>
    <button onclick="toggle_Eye(2)" id="password_eye2" class="password_eye" tabindex="-1">
    <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
    <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
    <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />
    <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" /></svg></button>
    <input type="password" id="password-input2_SignUp" placeholder="Repeat password" required class="input_field" /></div>
    <span id="error_header" class="text-bold text-xl text-red-400"></span><br>

    <button id="login-button" onclick="create_account()" class="bg-violet-700 hover:bg-violet-800 text-white font-bold py-2 text-lg rounded-xl w-full mb-4">Sign Up</button>

    <div class="w-full mt-4 space-y-4">
    <a id="google" href="${googleHref}">
    <button type="button" class="text-white bg-[#1973e7] font-medium rounded-xl text-lg px-5 py-2.5 w-full flex items-center justify-center gap-4 border">
    <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
    <path fill="#fbc02d" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#e53935" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4caf50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1565c0" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
    <span>Sign Up with Google</span></button></a>

    <a id="github" href="${githubHref}">
    <button type="button" class="text-white bg-[#221f1f] font-medium rounded-xl text-lg px-5 py-2.5 w-full flex items-center justify-center gap-4 border mt-2">
    <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
    <g fill="#ffffff" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(8.53333,8.53333)"><path d="M15,3c-6.627,0 -12,5.373 -12,12c0,5.623 3.872,10.328 9.092,11.63c-0.056,-0.162 -0.092,-0.35 -0.092,-0.583v-2.051c-0.487,0 -1.303,0 -1.508,0c-0.821,0 -1.551,-0.353 -1.905,-1.009c-0.393,-0.729 -0.461,-1.844 -1.435,-2.526c-0.289,-0.227 -0.069,-0.486 0.264,-0.451c0.615,0.174 1.125,0.596 1.605,1.222c0.478,0.627 0.703,0.769 1.596,0.769c0.433,0 1.081,-0.025 1.691,-0.121c0.328,-0.833 0.895,-1.6 1.588,-1.962c-3.996,-0.411 -5.903,-2.399 -5.903,-5.098c0,-1.162 0.495,-2.286 1.336,-3.233c-0.276,-0.94 -0.623,-2.857 0.106,-3.587c1.798,0 2.885,1.166 3.146,1.481c0.896,-0.307 1.88,-0.481 2.914,-0.481c1.036,0 2.024,0.174 2.922,0.483c0.258,-0.313 1.346,-1.483 3.148,-1.483c0.732,0.731 0.381,2.656 0.102,3.594c0.836,0.945 1.328,2.066 1.328,3.226c0,2.697 -1.904,4.684 -5.894,5.097c1.098,0.573 1.899,2.183 1.899,3.396v2.734c0,0.104 -0.023,0.179 -0.035,0.268c4.676,-1.639 8.035,-6.079 8.035,-11.315c0,-6.627 -5.373,-12 -12,-12z"></path></g></g></svg>
    <span>Sign Up with GitHub</span></button></a></div>
    `;
    return reply.code(200).send({ "response": return_signup });

}

export {
    login,
    register,
    settings,
    mfa,
    home,
    verify_email,
    verify_2fa,
    verify_custom,
    settings_set_prefered_mfa,
    profile,
    logout,
    user_settings,
    update_user,
    update_settings,
    friends,
    add_friends,
    accept_friend,
    reject_friend,
    block_friend,
    field_login,
    field_signup
}