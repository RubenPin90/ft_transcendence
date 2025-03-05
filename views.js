const modules = require('./modules');
const utils = require('./utils');
const send = require('./responses');
const db = require('./database/db_user_functions');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const fs = require("fs").promises

async function login(request, response) {
    const check_login = await modules.check_login(request, response);
    if (request.method === "POST") {
		const parsed = await utils.process_login(request, response);
        console.log(parsed);
        if (parsed) {
            const token = await modules.create_jwt(parsed, '1h');
				
			await modules.set_cookie(response, 'token', token, true, true, 'strict');
            const test = await send.redirect(response, '/', 302);
            return true;
        }
    }
    if (check_login === null)
        return false;
    const check = await send.send_html('login.html', response, 200, async (data) => {
        const link = await utils.google_input_handler();
        return data.replace("{{google_login}}", link);
    })
    return check;
}

async function register(request, response) {
    const check_login = await modules.check_login(request, response);
    if (check_login === null)
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
            return null;
        }
        const replace_data = await db.get_username(decoded.userid);
        if (!replace_data)
            return null;
        return data.replace("{{user_id}}", replace_data.username);
    });
    console.log(check);
    return true;
}

async function settings(request, response) {
    var [keys, values] = await modules.get_cookies(request.headers.cookie);
    if (request.url === '/' && !keys?.includes('token')) {
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
            const secret = {
                base32: process.env.OTP_SECRET,
                otpauth_url: speakeasy.otpauthURL({
                    secret: process.env.OTP_SECRET,
                    label: 'Mein Testprojekt',
                    encoding: 'base32'
                })
            };
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
            const secret = {
                base32: process.env.OTP_SECRET,
                otpauth_url: speakeasy.otpauthURL({
                    secret: process.env.OTP_SECRET,
                    label: 'Mein Testprojekt',
                    encoding: 'base32'
                })
            };
            const token = new URLSearchParams(replace_data).get('Code');
            if (!token || !secret)
                return false;
            console.log(token);
            const verified = speakeasy.totp.verify({
                secret: secret.base32,
                encoding: 'base32',
                token
              });
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            if (verified) {
                response.end(JSON.stringify({"Response": "Success"}));
            }
            else
                response.end(JSON.stringify({"Response": "Failed"}));
            return true;
        }
    }
    const status = await send.send_html('settings.html', response, 200, async (data) => {
        // if (code_registered)
        //     return data.replace("{{button}}", '<button onclick="regenerate_otc()">Code allready registered. Recreate?</button>');
        // if (!show_code)
        return data.replace("{{button}}", '<button onclick="create_otc()">Create OTP</button>');
        // else {
        //     return data.replace("{{button}}", `<img src=${output} alt="QR Code">`);
        // }
    });
    if (!status)
        return false;
    return true;
}

module.exports = {
    login,
    register,
    settings,
    home
}