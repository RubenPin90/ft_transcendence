import dotenv from 'dotenv';
import { Buffer } from 'buffer';
import * as settings_db from './database/db_settings_functions.js';
import * as users_db from './database/db_users_functions.js';
import * as mfa_db from './database/db_mfa_functions.js';
import * as send from './responses.js';
import https from 'https';
import * as modules from './modules.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

dotenv.config();

async function create_username(email) {
	const pos = email.indexOf('@');
	if (pos === -1)
		return -1;
	const pre_sliced = email.slice(0, pos);
	if (pre_sliced.length === 0)
		return -2;
	if (pre_sliced.indexOf('.') === -1)
		return pre_sliced;
	const modified_sliced = pre_sliced.replace(/\./g, '-');
	if (pre_sliced === modified_sliced)
		return -3;
	return modified_sliced;
}

async function google_input_handler() {
	const client_id = process.env.google_client_id;
	const redirect_uri = "http://localhost:8080";
	const scope = "openid email profile";
	const url = `https://accounts.google.com/o/oauth2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&approval_prompt=force`;
	return url;
}

async function github_input_handler() {
	const client_id = process.env.github_client_id;
	const redirect = "http://localhost:8080/";
	const scope = "user email";
	const state = process.env.github_state;
	const github_string = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect}&scope=${scope}&state=${state}`
	return github_string;
}

async function encrypt_github(request, response) {
	try {
		const client_id = process.env.github_client_id;
		const client_secret = process.env.github_client_secret;
		const redirect = "http://localhost:8080/";
		var code = request.url;

		code = code.slice(7);
		const pos = code.indexOf('&');
		code = code.slice(0, pos);
		const fetch_response_bearer = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				"Accept": 'application/json',
				"Content-Type": 'application/json'
			},
			body: JSON.stringify({
				client_id,
				client_secret,
				code,
				redirect_uri: redirect
			})
		});

		if (!fetch_response_bearer.ok)
			throw new Error(`HTTP error! status: ${fetch_response_bearer.status}`);

		var data = await fetch_response_bearer.json();
		const bearer_token = data.access_token;
		const fetch_response_user = await fetch('https://api.github.com/user', {
			headers: {
				"Authorization": `Bearer ${bearer_token}`,
				"Accept": 'application/json'
			}
		});

		if (!fetch_response_user.ok)
			throw new Error(`HTTP error! status: ${fetch_response_bearer.status}`);
		
		var user_data = await fetch_response_user.json();
		const userid = user_data.id;
		const pfp = user_data.avatar_url;
		var username = user_data.login;
		username = username.replace(/\./g, '-');
		const db_return = await settings_db.create_settings_value('test', pfp, 0, '', userid, 0);
		if (db_return.self === undefined || db_return.return === undefined)
			return userid;
		if (db_return < 0)
			return -2;
		const check_setting = await settings_db.get_settings_value(userid);
		if (!check_setting)
			return -3;
		const check_username = await users_db.create_users_value(0, username, userid);
		if (check_username < 0)
			return -4;
		return userid;
	} catch (err) {
		console.error("Error during Google OAuth:", error);
		return -5;
	}
}

async function encrypt_google(request, response) {
	const client_secret = process.env.google_client_secret;
	var code = request.url;
	code = code.slice(7);
	code = code.substring(0, code.indexOf("&scope"));
	code = code.replace("%2F", "/");
	let token_url = "https://oauth2.googleapis.com/token";
	const data = new URLSearchParams({
		'code': code,
		'client_id': process.env.google_client_id,
		'client_secret': client_secret,
		'redirect_uri': 'http://localhost:8080',
		'grant_type': 'authorization_code'
	}).toString();

	try {
		const token_data = await postRequest(token_url, data);
		if (!token_data)
			return -1;

		const id_token = token_data.id_token;
		const decoded_id_token = await decodeJWT(id_token);
		const userid = decoded_id_token.sub;
		const email = decoded_id_token.email;
		const pfp = decoded_id_token.picture;
		const username = await create_username(email);
		if (username < 0)
			return -2;
		const db_return = await settings_db.create_settings_value('test', pfp, 0, email, userid, 0);
		if (db_return.self === undefined || db_return.return === undefined)
			return userid;
		if (db_return < 0)
			return -3;
		const check_setting = await settings_db.get_settings_value(userid);
		if (!check_setting)
			return -4;
		const check_username = await users_db.create_users_value(0, username, userid);
		if (check_username < 0)
			return -5;
		return userid;
	} catch (error) {
		console.error("Error during Google OAuth:", error);
		return -6;
	}
}



async function decodeJWT(idToken) {
	const base64Payload = idToken?.split('.')[1];
	const payloadBuffer = Buffer.from(base64Payload, 'base64');
	return JSON.parse(payloadBuffer.toString('utf-8'));
}



async function postRequest(url, data) {
	return new Promise((resolve, reject) => {
		const urlObject = new URL(url);

		const options = {
			hostname: urlObject.hostname,
			path: urlObject.pathname,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': data.length
			}
		};

		const req = https.request(options, (res) => {
			let responseData = '';
			res.on('data', (chunk) => {
				responseData += chunk;
			});

			res.on('end', () => {
				resolve(JSON.parse(responseData));
			});
		});

		req.on('error', (error) => {
			reject(error);
		});

		req.write(data);
		req.end();
	});
}



async function process_login(request, response) {
    let body = '';
    
    return new Promise((resolve) => {
        request.on('data', chunk => {
            body += chunk.toString();
        });
        
        request.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const email = data.email;
                if (!email) {
					resolve(null);
                    return;
                }
                
				const check_settings = await settings_db.get_settings_value('email', email);				
				if (!check_settings || data.password !== check_settings.password) {
					console.log("Password incorrect");
					resolve(null);
					return;
				}

                const mfa = await mfa_db.get_mfa_value('self', check_settings.self);
				if (mfa === undefined || (mfa.otc && mfa.otc.endsWith('_temp'))) {
					resolve({"settings": check_settings, "mfa": null});
					return;
				}
				resolve({"settings": check_settings, "mfa": mfa});
            } catch (error) {
                resolve(null);  // null bei Fehlern
            }
        });
    });
}

async function get_frontend_content(request) {
	let body = '';
    
    return new Promise((resolve) => {
        request.on('data', chunk => {
            body += chunk.toString();
        });
        
        request.on('end', async () => {
            try {
                const data = JSON.parse(body);
                resolve(data);
            } catch (error) {
                resolve(null);
            }
        });
    });
}

async function get_cookie(search, request) {	
	var [keys, values] = await modules.get_cookies(request.headers.cookie);
	const tokenIndex = keys?.find((key) => key === search);
	if (!(keys && tokenIndex))
		return {'keys': null, 'values': null, 'token': null};
	const token = values?.at(tokenIndex);
	if (!token)
		return {'keys': null, 'values': null, 'token': null};
	return {keys, values, token};
}

async function check_login(request, response) {
	const {keys, values, token} = await get_cookie('token', request);
	if (keys === null && values === null && token === null)
		return 0;
	try {
		var decoded = await modules.get_jwt(token);
		if (decoded)
			return await send.redirect(response, '/', 302);
	} catch (err) {
		console.log(err);
		return -2;
	}
}

async function get_decrypted_userid(request, response) {
	const {keys, values, token} = await get_cookie('token', request);
	if (keys === null && values === null && token === null)
		return -1;
	try {
		var self_decoded = await modules.get_jwt(token);
	} catch (err) {
		const err_string = String(err);
		if (err_string.includes("jwt expired")) {
			response.writeHead(302, {
				'Set-Cookie': 'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
				'Location': '/login'
			});
			response.end();
			return -2;
		}
	}
	const self_decoded_id = self_decoded.userid;
	return self_decoded_id;
}

async function get_otc_secret(userid) {
	const secret = speakeasy.generateSecret({ length: 20 });
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (check_mfa !== undefined)
		await mfa_db.update_mfa_value('otc', `${secret.base32}_temp`, userid);
	else
		await mfa_db.create_mfa_value('', `${secret.base32}_temp`, '', 0, userid);
	const base32_secret = secret.base32;
	return base32_secret;
}

async function otc_secret(base32_secret) {
	const secret = {
		base32: base32_secret, // custom secret to every user. 1: look in db if secret exists. 2: If no, create one and return it. If yes, return it.
		otpauth_url: speakeasy.otpauthURL({
			secret: base32_secret,
			label: 'Mein Testprojekt',
			encoding: 'base32'
		})
	};
	return secret;
}

// replace_data: {'Function': 'verify', 'Code': ${code}}
async function verify_otc(request, response, replace_data, userid) {
	if (!userid)
		userid = await get_decrypted_userid(request);
	if (userid === -1)
		return false;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	var secret;
	if (check_mfa.otc.endsWith('_temp')) {
		const base32_secret = check_mfa.otc.slice(0, -5);
		secret = await otc_secret(base32_secret);
		if (!secret)
			return false;
	} else {
		secret = await otc_secret(check_mfa.otc);
		if (!secret)
			return false;
	}
	const token = replace_data.Code;
	if (!token)
		return false;
	const verified = speakeasy.totp.verify({
		secret: secret.base32,
		encoding: 'base32',
		token
	});
	return verified;
}

async function create_otc(userid, response) {
	if (userid === undefined || response === undefined || userid === -1)
		return false;
	const base32_secret = await get_otc_secret(userid);
	const secret = await otc_secret(base32_secret);
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
}

async function custom_code_error_checker(userid, response, replace_data) {
	if (userid === undefined || response === undefined || replace_data === undefined || userid === -1)
		return false;
	const check_settings = await settings_db.get_settings_value('self', userid);
	if (check_settings === undefined)
		return false;
	return true;
}

async function create_custom_code(userid, response, replace_data) {
    if (custom_code_error_checker(userid, response, replace_data) === false)
		return false;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	const check_code = replace_data.Code;
	response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (check_code.length != 6) {
		response.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return false;
	}
	if (isNaN(Number(check_code))) {
		response.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return false;
	}
	if (!check_mfa || check_mfa === undefined)
		await mfa_db.create_mfa_value('', '', `${check_code}_temp`, 0, userid);
	else
		await mfa_db.update_mfa_value('custom', `${check_code}_temp`, userid);
	response.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Success"}));
	return true;
}

async function verify_custom_code(userid, response, replace_data) {
	if (custom_code_error_checker(userid, response, replace_data) === false)
		return false;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (!check_mfa || check_mfa === undefined || check_mfa.custom.length === 0)
		return false;
	let custom = check_mfa.custom;
	if (custom.endsWith('_temp'))
		custom = custom.slice(0, -5);
	if (replace_data.Code !== custom)
		return false;
	await mfa_db.update_mfa_value('custom', custom, userid);
	if (check_mfa.prefered === 0)
		await mfa_db.update_mfa_value('prefered', 3, userid);
	return true;
}

async function create_email_code(userid, response, replace_data) {
	if (await custom_code_error_checker(userid, response, replace_data) === false)
		return false;
	const check_settings = await settings_db.get_settings_value('self', userid);
	if (check_settings === undefined)
		return false;
	response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (check_settings.email === undefined || !check_settings.email) {
		response.end(JSON.stringify({"Response": "NoEmail"}));
		return false;
	}
	var email_code = Math.floor(Math.random() * 1000000);
	const email_code_len = 6 - (String(email_code).length);
	for (var pos = 0; pos < email_code_len; pos++)
		email_code = '0' + email_code;
	await modules.send_email(check_settings.email, 'MFA code', `This is your 2FA code. Please do not share: ${email_code}`);
	email_code = await modules.create_encrypted_password(String(email_code));
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (!check_mfa || check_mfa === undefined)
		await mfa_db.create_mfa_value(`${email_code}_temp`, '', '', 0, userid);
	else
		await mfa_db.update_mfa_value('email', `${email_code}_temp`, userid);
	response.end(JSON.stringify({"Response": "Success", "Content": email_code}));
	return true;
}

async function verify_email_code(userid, response, replace_data) {
	if (await custom_code_error_checker(userid, response, replace_data) === false)
		return false;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (check_mfa === undefined || check_mfa === null || check_mfa.email.length === 0)
		return false;
	var email_value = check_mfa.email;
	if (email_value.endsWith('_temp'))
		email_value = email_value.slice(0, -5);
	const decrypted_email_value = await modules.check_encrypted_password(replace_data.Code, email_value);
	response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (decrypted_email_value === false) {
		response.end(JSON.stringify({"Response": "Failed"}));
		return false;
	}
	await mfa_db.update_mfa_value('email', email_value, userid);
	if (check_mfa.prefered === 0)
		await mfa_db.update_mfa_value('prefered', 1, userid);
	response.end(JSON.stringify({"Response": "Success"}));
	return true;
}

async function clear_settings_mfa(userid, search_value, response) {
	response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (check_mfa !== undefined) {
		await mfa_db.update_mfa_value(`${search_value}`, '', userid);
		var fallback_options = ['email', 'otc', 'custom'];
		var found = false;
		for (const option of fallback_options) {
			if (search_value == option)
				continue;
            console.log(check_mfa[option]);
            if (!check_mfa[option].endsWith('_temp') && check_mfa[option].length !== 0) {
                await mfa_db.update_mfa_value('prefered', fallback_options.indexOf(option) + 1, userid);
				found = true;
                break;
            }
			if (!found)
				await mfa_db.update_mfa_value('prefered', 0, userid);
        }
		response.end(JSON.stringify({"Response": "Success"}));
		return true;
	}
	response.end(JSON.stringify({"Response": "Failed"}));
	return false;
}

export {
	google_input_handler,
	github_input_handler,
	encrypt_google,
	encrypt_github,
	process_login,
	get_frontend_content,
	otc_secret,
	check_login,
	get_cookie,
	get_decrypted_userid,
	get_otc_secret,
	verify_otc,
	create_otc,
	create_custom_code,
	verify_custom_code,
	create_email_code,
	verify_email_code,
	clear_settings_mfa
}