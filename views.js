import * as modules from './modules.js';
import * as utils from './utils.js';
import * as send from './responses.js';
import * as users_db from './database/db_users_functions.js';
import * as mfa_db from './database/db_mfa_functions.js';
import qrcode from 'qrcode';

async function login(request, response) {
    const check_login = utils.check_login(request, response);
    if (request.method === "POST") {
        const parsed = await utils.process_login(request, response);
        console.log(parsed);
        if (parsed) {
            if (parsed.mfa && parsed.mfa.email && !parsed.mfa.email.endsWith('_temp') && parsed.mfa.prefered === 1) {
                console.log(parsed.mfa.self);
                var email_code = Math.floor(Math.random() * 1000000);
                const email_code_len = 6 - (String(email_code).length);
                for (var pos = 0; pos < email_code_len; pos++)
                    email_code = '0' + email_code;
                await modules.send_email(parsed.settings.email, 'MFA code', `This is your 2FA code. Please do not share: ${email_code}`);
                email_code = await modules.create_encrypted_password(String(email_code));
                await mfa_db.update_mfa_value('email', email_code, parsed.mfa.self);
                response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                response.end(JSON.stringify({"Response": 'send_email_verification', "Content": parsed.settings.self}));
                return true;
            } else if (parsed.mfa && parsed.mfa.otc && !parsed.mfa.otc.endsWith('_temp') && parsed.mfa.prefered === 2) {
                response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                response.end(JSON.stringify({"Response": 'send_2FA_verification', "Content": parsed.settings.self}));
                return true;
            } else if (parsed.mfa && parsed.mfa.custom && !parsed.mfa.custom.endsWith('_temp') && parsed.mfa.prefered === 3) {
                response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                response.end(JSON.stringify({"Response": 'send_custom_verification', "Content": parsed.settings.self}));
                return true;
            }
            const token = await modules.create_jwt(parsed.settings.self, '1h');
                    
            await modules.set_cookie(response, 'token', token, true, true, 'strict');
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.end(JSON.stringify({"Response": 'reload', "Content": null}));
            return true;
        }
    }
    if (!check_login || check_login === undefined || check_login < -1)
        return false;
    const check = await send.send_html('login.html', response, 200, async (data) => {
        const google_link = await utils.google_input_handler();
        data = data.replace("{{google_login}}", google_link);
        const github_link = await utils.github_input_handler();
        return data.replace("{{github_login}}", github_link);
    });
    return check;
}

async function register(request, response) {
    const check_login = await utils.check_login(request, response);
    console.log(check_login);
    if (check_login !== 0)
        return false;
    const check = await send.send_html('register.html', response, 200, async (data) => {
        const google_link = await utils.google_input_handler();
        data = data.replace("{{google_login}}", google_link);
        const github_link = await utils.github_input_handler();
        return data.replace("{{github_login}}", github_link);
    })
    return check;
}

async function home(request, response) {
    var [keys, values] = modules.get_cookies(request.headers.cookie);
    if (request.url === '/' && !keys?.includes('token'))
        return send.redirect(response, '/login', 302);
    if (request.url !== '/' && !request.url.includes('&state=')) {
        const data = await utils.encrypt_google(request);
        if (data < 0) {
            console.log(data);
            return false;
        }
        const token = modules.create_jwt(data, '1h');
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
		send.redirect(response, '/', 302);
        return true;
    } else if (request.url !== '/') {
        const data = await utils.encrypt_github(request, response);
        if (data < 0) {
            console.log(data);
            return false;
        }
        const token = modules.create_jwt(data, '1h');
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
		send.redirect(response, '/', 302);
        return true;
    }
    // all good till here
    const check = await send.send_html('home.html', response, 200, async (data) => {
        const tokenIndex = keys?.find((key) => key === 'token');
        const token = values?.at(tokenIndex);
        try {
            var decoded = await modules.get_jwt(token);
        } catch (err) {
            console.log(err);
            return false;
        }
        const replace_data = await users_db.get_users_value('self', decoded.userid);
        if (!replace_data)
            return false;
        return data.replace("{{userid}}", replace_data.username);
    });
    return true;
}

async function settings(request, response) {
    var [keys, values] = await modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        await send.redirect(response, '/login', 302);
        return true;
    }
        if (request.method === "POST") {
        var replace_data = await utils.get_frontend_content(request);
        console.log(replace_data);
        if (!replace_data) {
            return false;
        }
        const userid = await utils.get_decrypted_userid(request, response);
        if (replace_data.Function == 'create_otc') {
            return await utils.create_otc(userid, response);
        } else if (replace_data.Function == 'verify') {
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            var verified = await utils.verify_otc(request, response, replace_data, null);
            if (verified) {
                const check_mfa = await mfa_db.get_mfa_value('self', userid);
                var new_otc_str = check_mfa.otc;
                if (new_otc_str.endsWith('_temp'))
                    new_otc_str = new_otc_str.slice(0, -5);
                await mfa_db.update_mfa_value('otc', new_otc_str, userid);
                if (check_mfa.prefered === 0)
                    await mfa_db.update_mfa_value('prefered', 2, userid);
                response.end(JSON.stringify({"Response": "Success"}));
            }
            else
                response.end(JSON.stringify({"Response": "Failed"}));
            return true;
        } else if (replace_data.Function == 'create_custom') {
            return await utils.create_custom_code(userid, response, replace_data);
        } else if (replace_data.Function == 'verify_function') {
            const custom_code_return = await utils.verify_custom_code(userid, response, replace_data);
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            if (custom_code_return === true)
                response.end(JSON.stringify({"Response": "Success"}));
            else
                response.end(JSON.stringify({"Response": "failed"}));
            return custom_code_return;
        } else if (replace_data.Function == 'create_email') {
            return await utils.create_email_code(userid, response, replace_data);
        } else if (replace_data.Function == 'verify_email') {
            return await utils.verify_email_code(userid, response, replace_data);
        } else if (replace_data.Function == 'remove_custom_code') {
            return await utils.clear_settings_mfa(userid, 'custom', response);
        } else if (replace_data.Function === 'remove_otc') {
            return await utils.clear_settings_mfa(userid, 'otc', response);
        } else if (replace_data.Function === 'remove_email') {
            return await utils.clear_settings_mfa(userid, 'email', response);
        }
    }
    const status = await send.send_html('settings.html', response, 200, async (data) => {
        const userid = await utils.get_decrypted_userid(request, response);
        if (userid === -1)
            await send.redirect(response, '/login', 302);
        else if (userid === -2)
            return true;
        const check_mfa = await mfa_db.get_mfa_value('self', userid);
        console.log(check_mfa);
        if (check_mfa === undefined || check_mfa === null)
            return data.replace("{{mfa-button}}", '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_otc()"><span class="button_text">Create OTC</span></button></div>\
                <div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_custom_code()"><span class="button_text">Create custom 6 diggit code</span></button></div>\
                <div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_email()"><span class="button_text">Enable email authentication</span></button></div>\
                <button onclick="window.location.href = \'http://localhost:8080\'">Back</button>\
                <button onclick="logout()">Logout</button>');
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
        // replace_string += '<br></br>'
        if (check_mfa.custom.length !== 0 && !check_mfa.custom.endsWith('_temp')) {
            replace_string += '<button onclick="create_custom_code()">Recreate custom 6 diggit code</button> ';
            replace_string += '<button onclick="remove_custom_code()">Remove custom 6 digit code</button> ';
            select_number++;
            select_menu += '<option value="custom">Custom</option>';
        } else
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_custom_code()"><span class="button_text">Create custom 6 diggit code</span></button></div> ';
        // replace_string += '<br></br>'
        if (check_mfa.email.length !== 0 && !check_mfa.email.endsWith('_temp')) {
            console.log("WOW");
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="remove_email()"><span class="button_text">Disable email authentication</span></button></div> ';
            select_number++;
            select_menu += '<option value="email">Email</option>';
        } else
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_email()"><span class="button_text">Enable email authentication</span></button></div> ';
        // replace_string += '<br></br>'
        if (select_number < 2)
            return data.replace("{{mfa-button}}", `${replace_string} <button onclick="window.location.href = \'http://localhost:8080\'">Back</button> \
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
        return data.replace("{{mfa-button}}", `${replace_string} ${select_menu} <button onclick="window.location.href = \'http://localhost:8080\'">Back</button> \
        <button onclick="logout()">Logout</button>`);
    });
    if (!status)
        return false;
    return true;
}

async function settings_set_prefered_mfa(request, response) {
    if (request.url.length < 11)
        return await send.redirect(response, '/settings', 302);
    const location = request.url.slice(10);
    if (!location.indexOf('='))
        return await send.redirect(response, '/settings', 302);
    const pos = location.indexOf('=') + 1;
    if (location.length === pos)
        return await send.redirect(response, '/settings', 302);
    const method = location.slice(pos);
    const {keys, values} = await utils.get_cookie('token', request);
    if ((!keys && !values) || (keys === undefined && values === undefined))
        return await send.redirect(response, '/settings', 302);
    const decrypted_user = await modules.get_jwt(values[0]);
    const userid = decrypted_user.userid;
    const check_mfa = await mfa_db.get_mfa_value('self', userid);
    if (!check_mfa || check_mfa === undefined)
        return await send.redirect(response, '/settings', 302);
    if (method === 'email') {
        await mfa_db.update_mfa_value('prefered', 1, userid);
    } else if (method === 'otc') {
        await mfa_db.update_mfa_value('prefered', 2, userid);
    } else if (method === 'custom') {
        await mfa_db.update_mfa_value('prefered', 3, userid);
    }
    return await send.redirect(response, '/settings', 302);    
}

async function verify_email(request, response) {
    if (request.method !== 'POST')
        return await send.send_error_page('404.html', response, 404);
    const frontend_data = await utils.get_frontend_content(request);
    if (!frontend_data)
        return false;
    const check_mfa = await mfa_db.get_mfa_value('self', frontend_data.userid);
    if (!check_mfa || check_mfa === null || check_mfa.email.length === 0 || check_mfa.email.endsWith('_temp'))
        return false;
    const valid_password = await modules.check_encrypted_password(frontend_data.code, check_mfa.email);
    if (!valid_password) {
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = await modules.create_jwt(frontend_data.userid, '1h');
        
        await modules.set_cookie(response, 'token', token, true, true, 'strict');
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'reload', "Content": null}));
    }
    return true;
}

async function verify_2fa(request, response) {
    if (request.method !== 'POST')
        return await send.send_error_page('404.html', response, 404);
    const frontend_data = await utils.get_frontend_content(request);
    if (!frontend_data)
        return false;
    const replace_data = {'Function': 'verify', 'Code': frontend_data.code};
    const temp = await utils.verify_otc(request, response, replace_data, frontend_data.userid);
    console.log(temp);
    if (temp === false) {
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = await modules.create_jwt(frontend_data.userid, '1h');
        
        await modules.set_cookie(response, 'token', token, true, true, 'strict');
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'reload', "Content": null}));
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
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = await modules.create_jwt(frontend_data.userid, '1h');
        
        await modules.set_cookie(response, 'token', token, true, true, 'strict');
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'reload', "Content": null}));
    }
    return true;
}

export {
    login,
    register,
    settings,
    home,
    verify_email,
    verify_2fa,
    verify_custom,
    settings_set_prefered_mfa
}