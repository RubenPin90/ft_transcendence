import * as modules from './modules.js';
import * as utils from './utils.js';
import * as send from './responses.js';
import * as users_db from './database/db_users_functions.js';
import * as mfa_db from './database/db_mfa_functions.js';
import qrcode from 'qrcode';

async function login(request, response) {
    const check_login = await utils.check_login(request, response);
    if (request.method === "POST") {
        const parsed = await utils.process_login(request, response);
        console.log(parsed);
        if (parsed) {
            if (parsed.mfa && parsed.mfa.otc && !parsed.mfa.otc.endsWith('_temp')) {
                response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                response.end(JSON.stringify({"Response": 'send_2FA_verification', "Content": parsed.settings.self}));
                return true;
            }
            const token = await modules.create_jwt(parsed.settings.self, '1h');
                    
            await modules.set_cookie(response, 'token', token, true, true, 'strict');
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.end(JSON.stringify({"Response": 'reload', "Content": null}));
            return true;
        }
    }
    if (check_login !== 0)
        return false;
    const check = await send.send_html('login.html', response, 200, async (data) => {
        const link = await utils.google_input_handler();
        return data.replace("{{google_login}}", link);
    })
    return check;
}

async function register(request, response) {
    const check_login = await utils.check_login(request, response);
    if (check_login !== 0)
        return false;
    const check = await send.send_html('register.html', response, 200, async (data) => {
        const link = await utils.google_input_handler();
        return data.replace("{{google_login}}", link);
    })
    return check;
}

async function home(request, response) {
    var [keys, values] = await modules.get_cookies(request.headers.cookie);
    if (request.url === '/' && !keys?.includes('token')) {
        await send.redirect(response, '/login', 302);
        return true;
    }
    if (request.url !== '/') {
        const data = await utils.encrypt_google(request, response);
        if (data < 0)
            return false;
        const token = await modules.create_jwt(data, '1h');

        await modules.set_cookie(response, 'token', token, true, true, 'strict');
		await send.redirect(response, '/', 302);
        return true;
    }
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
        return data.replace("{{user_id}}", replace_data.username);
    });
    return true;
}

async function settings(request, response) {
    var [keys, values] = await modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        await send.redirect(response, '/login', 302);
        return true;
    }
    var code_registered = false;
    var show_code = false;
    if (request.method === "POST") {
        var replace_data = await utils.get_frontend_content(request);
        if (!replace_data) {
            return false;
        }
        const userid = await utils.get_decrypted_userid(request);
        if (replace_data.Function === 'create_otc') {
            return await utils.create_otc(userid, response);
        } else if (replace_data.Function == 'verify') {
            var verified = await utils.verify_otc(request, response, replace_data, null);
            console.log(verified);
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            if (verified) {
                const check_mfa = await mfa_db.get_mfa_value('self', userid);
                var new_otc_str = check_mfa.otc;
                if (new_otc_str.endsWith('_temp'))
                    new_otc_str = new_otc_str.slice(0, -5);
                await mfa_db.update_mfa_value('otc', new_otc_str, userid);
                response.end(JSON.stringify({"Response": "Success"}));
            }
            else
                response.end(JSON.stringify({"Response": "Failed"}));
            return true;
        }
    }
    const status = await send.send_html('settings.html', response, 200, async (data) => {
        const userid = await utils.get_decrypted_userid(request);
        if (userid === -1)
            await send.redirect(response, '/login', 302);
        const check_mfa = await mfa_db.get_mfa_value('self', userid);
        console.log(check_mfa);
        if (check_mfa.otc.length !== 0 && !check_mfa.otc.endsWith('_temp'))
            return data.replace("{{button}}", '<button onclick="create_otc()">Regenerate OTC</button> <button onclick="logout()">Logout</button>');
        return data.replace("{{button}}", '<button onclick="create_otc()">Create OTP</button> <button onclick="logout()">Logout</button>');
    });
    if (!status)
        return false;
    return true;
}

async function verify_2fa(request, response) {
    if (request.method !== 'POST')
        return await send.send_error_page('404.html', response, 404);
    const frontend_data = await utils.get_frontend_content(request);
    if (!frontend_data)
        return false;
    const replace_data = {'Function': 'verify', 'Code': frontend_data.code};
    const temp = await utils.verify_otc(request, response, replace_data, frontend_data.user_id);
    console.log(temp);
    if (temp === false) {
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = await modules.create_jwt(frontend_data.user_id, '1h');
        
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
    verify_2fa
}