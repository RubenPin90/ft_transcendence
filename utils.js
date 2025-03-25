import dotenv from 'dotenv';
import { Buffer } from 'buffer';
import * as settings_db from './database/db_settings_functions.js';
import * as users_db from './database/db_users_functions.js';
import * as mfa_db from './database/db_mfa_functions.js';
import https from 'https';
import * as modules from './modules.js';
import speakeasy from 'speakeasy';
import { callbackify } from 'util';
import { checkPrime } from 'crypto';

dotenv.config

async function create_username(email) {
	const pos = email.indexOf('@');
	if (pos === -1)
		return -1;
	const pre_sliced = email.slice(0, pos);
	if (pre_sliced.length === 0)
		return -2;
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
		const user_id = decoded_id_token.sub;
		const email = decoded_id_token.email;
		const pfp = decoded_id_token.picture;
		const username = await create_username(email);
		if (username < 0)
			return -2;
		const db_return = await settings_db.create_settings_value('', pfp, 0, 0, user_id, 0);
		if (db_return.self === undefined || db_return.return === undefined)
			return user_id;
		if (db_return < 0)
			return -3;
		const check_setting = await settings_db.get_settings_value(user_id);
		if (!check_setting)
			return -4;
		const check_username = await users_db.create_users_value(0, username, user_id);
		if (check_username < 0)
			return -5;
		return user_id;
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
                const email = await db.is_email(data.email);
                
                if (!email) {
                    resolve(null);  // null wenn Email nicht gefunden
                    return;
                }
                
                const password = await db.get_password(data.email);
                if (!password) {
                    resolve(null);  // null wenn Passwort nicht gefunden
                    return;
                }
                
                resolve(String(password.self));  // String wenn alles erfolgreich
            } catch (error) {
                resolve(null);  // null bei Fehlern
            }
        });
    });
}

async function get_settings_content(request) {
	let body = '';
    
    return new Promise((resolve) => {
        request.on('data', chunk => {
            body += chunk.toString();
        });
        
        request.on('end', async () => {
            try {
                const data = JSON.parse(body);
                resolve(data);  // String wenn alles erfolgreich
            } catch (error) {
                resolve(null);  // null bei Fehlern
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

async function get_decrypted_userid(request) {
	const {keys, values, token} = await get_cookie('token', request);
	if (keys === null && values === null && token === null)
		return -1;
	const self_decoded = await modules.get_jwt(token);
	const self_decoded_id = self_decoded.userid;
	return self_decoded_id;
}

async function get_otc_secret(userid) {
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	var base32_secret;
	if (check_mfa === undefined || check_mfa.otc.length == 0) {
		const secret = speakeasy.generateSecret({ length: 20 });
		await mfa_db.create_mfa_value('', `${secret.base32}_temp`, 0, userid);
		base32_secret = secret.base32;
	} else {
		base32_secret = check_mfa.otc;
	}
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

async function verify_otc(request, response, replace_data) {
	const userid = await get_decrypted_userid(request);
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
	console.log(token);
	const verified = speakeasy.totp.verify({
		secret: secret.base32,
		encoding: 'base32',
		token
	});
	response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (verified) {
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

export {
	google_input_handler,
	encrypt_google,
	process_login,
	get_settings_content,
	otc_secret,
	check_login,
	get_cookie,
	get_decrypted_userid,
	get_otc_secret,
	verify_otc
}