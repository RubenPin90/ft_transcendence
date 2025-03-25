import * as modules from './modules.js';
import * as utils from './utils.js';
import * as send from './responses.js';
import * as settings_db from './database/db_settings_functions.js';
import * as users_db from './database/db_users_functions.js';
import * as mfa_db from './database/db_mfa_functions.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { promises as fs } from 'fs';

async function login(request, response) {
    const check_login = await utils.check_login(request, response);
    console.log(check_login);
    if (request.method === "POST") {
        const parsed = await utils.process_login(request, response);
        if (parsed) {
            const token = await modules.create_jwt(parsed, '1h');
            
			await modules.set_cookie(response, 'token', token, true, true, 'strict');
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.end(JSON.stringify({"Response": 'reload'}));
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
        var replace_data = await utils.get_settings_content(request);
        // if (!replace_data) {
        //     return false;
        // }
        console.log(replace_data);
        if (replace_data.Function === 'create_otc') {
            const userid = await utils.get_decrypted_userid(request);
            if (userid === -1)
                return false;
            const base32_secret = await utils.get_otc_secret(userid);
            const secret = await utils.otc_secret(base32_secret);
            if (!secret)
                return false;
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            qrcode.toDataURL(secret.otpauth_url, (err, url) => {
                if (err) {
                    response.end('Fehler beim Generieren des QR-Codes');
                    return;
                }
                response.end(JSON.stringify(url));
            });
            return true;
        } else if (replace_data.Function == 'verify') {
            return await utils.verify_otc(request, response, replace_data);
        }
    }
    
    const status = await send.send_html('settings.html', response, 200, async (data) => {
        const userid = await utils.get_decrypted_userid(request);
        if (userid === -1)
            await send.redirect(response, '/login', 302);
        const check_mfa = await mfa_db.update_mfa_value('self', userid);
        console.log(check_mfa);
        // if (check_mfa.otc.length !== 0 && !check_mfa.otc.endsWith('_temp'))
        //     return data.replace("{{button}}", '<button onclick="recreate_otc()"Regenerate OTC</button>');
        return data.replace("{{button}}", '<button onclick="create_otc()">Create OTP</button>');
    });
    if (!status)
        return false;
    return true;
}

export {
    login,
    register,
    settings,
    home
}