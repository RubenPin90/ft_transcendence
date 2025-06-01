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
        // const lang = modules.create_jwt(parsed.settings.lang, '1h');
        const lang = modules.create_jwt('en', '1h'); //todo change later to actual settings value

        modules.set_cookie(response, 'token', token, 3600);
        modules.set_cookie(response, 'lang', lang, 3600);

        // response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        // response.raw.end(JSON.stringify({"Response": 'success', "Settings": parsed.settings, "Mfa": parsed.mfa, "Content": null}));
        return response.code(200).header('Content-Type', 'application/json').header('Access-Control-Allow-Origin', '*').send({"Response": 'success', "Settings": parsed.settings, "Mfa": parsed.mfa, "Content": null})
        // return true;
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
        const lang = modules.create_jwt('en', '1h');
        
        modules.set_cookie(response, 'token', token, 3600);
        modules.set_cookie(response, 'lang', lang, 3600);
        // response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        // response.raw.end(JSON.stringify({"Response": 'success', "Content": null}));
        return response.code(200).header('Content-Type', 'application/json').header('Access-Control-Allow-Origin', '*').send({ "Response": 'success', "Content": null })
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
            if (verified && verified !== undefined && !(verified < 0)) {
                const check_mfa = await mfa_db.get_mfa_value('self', userid);
                var new_otc_str = check_mfa.otc;
                if (new_otc_str.endsWith('_temp'))
                    new_otc_str = new_otc_str.slice(0, -5);
                await mfa_db.update_mfa_value('otc', new_otc_str, userid);
                if (check_mfa.prefered === 0)
                    await mfa_db.update_mfa_value('prefered', 2, userid);
                response.raw.end(JSON.stringify({"Response": "Success"}));
            }
            else
                response.raw.end(JSON.stringify({"Response": "Failed"}));
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


// async function user(request, response){
//     var [keys, values] = modules.get_cookies(request.headers.cookie);
//     if (!keys?.includes('token'))
//         return // Here was a redirect(response, '/login', 302);
//     var request_url = request.url.slice(14);
//     if (request_url == '/select_language')
//         return await select_language(request, response);
//     if (request_url == '/profile_settings')
//         return await user_settings(request, response);

//     const status = await send.send_html('settings.html', response, 200, async  (data) => {
//         var replace_string = "";
//         replace_string += '<div><a href="/settings/user/select_language" data-link><div class="buttons mb-6"></a></div>';
//         replace_string += '<button class="block w-full mb-6 mt-6">';
//         replace_string += '<span class="button_text">Select Language</span>';
//         replace_string += '</button></div>';

//         replace_string += '<div><a href="/settings/user" data-link><div class="buttons mb-6"></a></div>';
//         replace_string += '<button class="block w-full mb-6 mt-6">';
//         replace_string += '<span class="button_text">Profile changes</span>';
//         replace_string += '</button></div>';

//         replace_string += '<div class="flex mt-12 gap-4 w-full">';
//         replace_string += '<a class="flex-1" href="/settings" data-link>';
//         replace_string += '<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
//         replace_string += '<span class="button_text">Back</span>';
//         replace_string += '</button></a>';
//         replace_string += '<a class="flex-1">';
//         replace_string += '<button onclick="logout()" class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
//         replace_string += '<span class="button_text">Logout</span>';
//         replace_string += '</button></a></div>';
//         return data.replace('{{mfa-button}}', replace_string);
//     });
//     if (!status || status === undefined || status < 0)
//         return `_${status}`
//     return true;
// }

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
    lang = await modules.get_jwt(lang);
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
    var [keys, values] = modules.get_cookies(request);
    if (keys?.includes('token'))
        return await home(request, response);


    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = modules.get_jwt(token);
    } catch (err){
        console.error(`Error in profile views.js: ${err}`);
        return // Here was a redirect(response, '/login', 302);
    }

    const user = await users_db.get_users_value('self', decoded.userid);
    if (!user || user === undefined){
        return response.code(404).header('Content-Type', 'application/json').header('Access-Control-Allow-Origin', '*').send({ "Response": 'fail', "Content": "No user or user undefined"});

        // return send.send_error_page('404.html', response, 404);
    }

    const settings = await settings_db.get_settings_value('self', decoded.userid);
    if (!settings || settings === undefined){
        return response.code(404).header('Content-Type', 'application/json').header('Access-Control-Allow-Origin', '*').send({ "Response": 'fail', "Content": "no settings or settings undefined"});

        // return send.send_error_page('404.html', response, 404);
    }

    const userid = decoded.userid;


    const inner = request.body;
    inner = inner.replace('{{username}}', user.username);
    inner = inner.replace('{{email}}', settings.email || 'Not provided');
    inner = inner.replace('{{picture}}', settings.pfp || 'public/default_profile.svg');
    inner = inner.replace('{{status}}', ()=> {if (user.status === 1) return 'online'; else return 'offline'});
    inner = inner.replace('{{Friends}}', await friends_request.show_accepted_friends(userid))



    return response.code(200).header('Content-Type', 'application/json').header('Access-Control-Allow-Origin', '*').send({ "Response": 'success', "Content": inner});

    // const status = await send.send_html('index.html', response, 200, async(data) => {
    //     var [keys, values] = modules.get_cookies(request.headers.cookie);
    //     const lang_check = keys?.find((key) => key === 'lang');
    //     if (!lang_check || lang_check === undefined || lang_check == false)
    //         return false;
    //     const langIndex = keys.indexOf('lang');
    //     const lang = values[langIndex];
    //     try {
    //         var decoded_lang = modules.get_jwt(lang);
    //     } catch (err) {
    //         return false;
    //     }
    //     data = await utils.replace_all_templates(request, response);
    //     data = utils.show_page(data, "profile_div");
    //     data = await translator.cycle_translations(data, decoded_lang.userid);
    //     data = data.replace('{{username}}', user.username);
    //     data = data.replace('{{email}}', settings.email || 'Not provided');
    //     data = data.replace('{{picture}}', settings.pfp || 'public/default_profile.svg');
    //     data = data.replace('{{status}}', ()=> {if (user.status === 1) return 'online'; else return 'offline'});
    //     data = data.replace('{{Friends}}', await friends_request.show_accepted_friends(userid))
    //     return data;
    // });

    // if (!status || status === undefined || status < 0){
    //     return `Error rendering profile page: ${status}`;
    // }
    // return true;
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
    block_friend
}