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

function create_username(email) {
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

function google_input_handler() {
	const client_id = process.env.google_client_id;
	const redirect_uri = "http://localhost:8080";
	const scope = "openid email profile";
	const url = `https://accounts.google.com/o/oauth2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&approval_prompt=force`;
	return url;
}

function github_input_handler() {
	const client_id = process.env.github_client_id;
	const redirect = "http://localhost:8080/";
	const scope = "user:email";
	const state = process.env.github_state;
	const github_string = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect}&scope=${scope}&state=${state}`
	return github_string;
}

async function encrypt_github(request) {
	const client_id = process.env.github_client_id;
	const client_secret = process.env.github_client_secret;
	const redirect = "http://localhost:8080/";
	const base_code = request.url;

	const sliced_code = base_code.slice(7);
	if (!sliced_code || sliced_code === undefined || sliced_code.length == 0)
		return -1;
	const code = sliced_code.substring(0, sliced_code.indexOf('&'));
	if (!code || code === undefined || code.length == 0)
		return -2;
	var header = {"Accept": 'application/json', "Content-Type": 'application/json'};
	var body;
	try {
		body = JSON.stringify({client_id, client_secret, code, redirect_uri: redirect});
	} catch (err) {
		return -3;
	}
	const fetch_response_bearer = await modules.easyfetch('https://github.com/login/oauth/access_token', 'POST', header, body);
	if (!fetch_response_bearer || fetch_response_bearer === undefined || fetch_response_bearer < 0)
		return -4;

	header = {"Authorization": `Bearer ${fetch_response_bearer.access_token}`, "Accept": 'application/json'};
	const fetch_response_user = await modules.easyfetch('https://api.github.com/user', 'GET', header);
	if (!fetch_response_user || fetch_response_user === undefined || fetch_response_user < 0)
		return -5;
	
	const fetch_response_email = await modules.easyfetch('https://api.github.com/user/emails', 'GET', header);
	if (!fetch_response_email || fetch_response_email === undefined || fetch_response_email < 0)
		return -6;

	const user_email = fetch_response_email[0].email;
	const userid = fetch_response_user.id;
	const pfp = fetch_response_user.avatar_url;
	var username = fetch_response_user.login;
	if (!user_email || !userid || !pfp || !username || user_email === undefined || userid === undefined || username === undefined || pfp === undefined || user_email.length == 0 || userid.length == 0 || username.length == 0 || pfp.length == 0)
		return -7;
	username = username.replace(/\./g, '-');
	const db_return = await settings_db.create_settings_value('', pfp, 0, user_email, 'en', 0, userid);
	console.log(db_return);
	if (db_return.self === undefined || db_return.return === undefined)
		return userid;
	if (db_return < 0)
		return -8;
	const check_setting = await settings_db.get_settings_value(userid);
	if (!check_setting)
		return -9;
	const check_username = await users_db.create_users_value(0, username, userid);
	if (check_username < 0)
		return -10;
	return userid;
}

async function encrypt_google(request) {
	const client_secret = process.env.google_client_secret;
	const base_code = request.url;
	const sliced_code = base_code.slice(7);
	if (!sliced_code || sliced_code === undefined || sliced_code.length == 0)
		return -1;
	const subbed_code = sliced_code.substring(0, sliced_code.indexOf("&scope"));
	if (!subbed_code || subbed_code === undefined || subbed_code.length == 0)
		return -2;
	const code = subbed_code.replace("%2F", "/");
	if (!code || code === undefined || code == subbed_code)
		return -3;
	
	try {
		const header = {"Accept": 'application/json', "Content-Type": 'application/json'};
		const body = JSON.stringify({'code': code, 'client_id': process.env.google_client_id, 'client_secret': client_secret, 'redirect_uri': 'http://localhost:8080', 'grant_type': 'authorization_code'})
		const token_data = await modules.easyfetch("https://oauth2.googleapis.com/token", 'POST', header, body);
		if (!token_data || token_data === undefined || token_data == -1)
			return -4;
		if (!token_data.id_token || token_data.id_token === undefined || token_data.id_token.length == 0)
			return -5;
		const id_token = token_data.id_token;
		const decoded_id_token = decodeJWT(id_token);
		if (decoded_id_token < 0)
			return -6;
		const userid = decoded_id_token.sub;
		const email = decoded_id_token.email;
		const pfp = decoded_id_token.picture;
		if (!userid || userid === undefined || userid.length == 0 || !email || email === undefined || email.length == 0 || !pfp || pfp === undefined || pfp.length == 0)
			return -7;
		const username = create_username(email);
		if (username < 0)
			return -8;
		const db_return = await settings_db.create_settings_value('', pfp, 0, email, 'en', userid, 0);
		if (!db_return || db_return === undefined)
			return -9
		if (db_return.self === undefined || db_return.return === undefined)
			return userid;
		if (db_return < 0)
			return -10;
		const check_setting = await settings_db.get_settings_value(userid);
		if (!check_setting || check_setting === undefined)
			return -11;
		const check_username = await users_db.create_users_value(0, username, userid);
		if (check_username < 0 || check_username === undefined)
			return -12;
		console.log("Here");
		return userid;
	} catch (error) {
		console.error("Error during Google OAuth:", error);
		return -13;
	}
}



function decodeJWT(idToken) {
	if (!idToken || idToken === undefined || idToken.length == 0)
		return -1;
	const base64Payload = idToken.split('.');
	if (!base64Payload || base64Payload === undefined || base64Payload == idToken)
		return -2;
	const single_base64Payload = base64Payload[1];
	var payloadBuffer;
	try {
		payloadBuffer = Buffer.from(single_base64Payload, 'base64');		
	} catch (err) {
		return -3;
	}
	if (!payloadBuffer || payloadBuffer === undefined)
		return -4;
	var parsed_buffer;
	try {
		parsed_buffer = JSON.parse(payloadBuffer.toString('utf-8'));
	} catch (err) {
		return -5;
	}
	if (!parsed_buffer || parsed_buffer === undefined)
		return -6;
	return parsed_buffer;
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
					resolve(-1);
                    return;
                }
                
				const check_settings = await settings_db.get_settings_value('email', email);
				if (!check_settings || check_settings === undefined) {
					resolve(-2);
					return;
				}
				const pw = await modules.check_encrypted_password(data.password, check_settings.password);
				if (!pw || pw === undefined || pw < 0) {
					console.log("Password incorrect");
					resolve(-3);
					return;
				}

                const mfa = await mfa_db.get_mfa_value('self', check_settings.self);
				if (mfa === undefined || (mfa.otc && mfa.otc.endsWith('_temp'))) {
					resolve({"settings": check_settings, "mfa": null});
					return;
				}
				resolve({"settings": check_settings, "mfa": mfa});
            } catch (error) {
                resolve(null);
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
				return;
            } catch (error) {
                resolve(null);
				return;
            }
        });
    });
}

function get_cookie(search, request) {
	var [keys, values] = modules.get_cookies(request.headers.cookie);
	const tokenIndex = keys?.find((key) => key === search);
	if (!(keys && tokenIndex))
		return {'keys': null, 'values': null, 'token': null};
	const token = values?.at(tokenIndex);
	if (!token)
		return {'keys': null, 'values': null, 'token': null};
	return {keys, values, token};
}

function check_login(request, response) {
	const {keys, values, token} = get_cookie('token', request);
	if (keys === null && values === null && token === null)
		return -1;
	try {
		var decoded = modules.get_jwt(token);
		if (!decoded || decoded === undefined)
			return -2;
		send.redirect(response, '/', 302);
		return true;
	} catch (err) {
		console.log(err);
		return -3;
	}
}

function get_decrypted_userid(request, response) {
	const {keys, values, token} = get_cookie('token', request);
	if (keys === null && values === null && token === null)
		return -1;
	var pos = 0;
	for (var i = 0; i < keys.length; i++, pos++) {
		if (keys[i] == 'token')
			break;
	}
	try {
		var self_decoded = modules.get_jwt(values[0]);
	} catch (err) {
		const err_string = String(err);
		console.log(err_string);
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
	var secret;
	try {
		secret = speakeasy.generateSecret({ length: 20 });
	} catch (err) {
		return -1;
	}
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (check_mfa && check_mfa !== undefined)
		await mfa_db.update_mfa_value('otc', `${secret.base32}_temp`, userid);
	else
		await mfa_db.create_mfa_value('', `${secret.base32}_temp`, '', 0, userid);
	const base32_secret = secret.base32;
	return base32_secret;
}

function otc_secret(base32_secret) {
	var secret;
	try {
		secret = {
			base32: base32_secret, // custom secret to every user. 1: look in db if secret exists. 2: If no, create one and return it. If yes, return it.
			otpauth_url: speakeasy.otpauthURL({
				secret: base32_secret,
				label: 'FT_Transendence',
				encoding: 'base32'
			})
		};
	} catch (err) {
		return -1;
	}
	return secret;
}

// replace_data: {'Function': 'verify', 'Code': ${code}}
async function verify_otc(request, response, replace_data, userid) {
	if (!userid || userid === undefined)
		userid = get_decrypted_userid(request);
	if (userid < 0)
		return -1;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	var secret;
	if (check_mfa.otc.endsWith('_temp')) {
		const base32_secret = check_mfa.otc.slice(0, -5);
		if (!base32_secret || base32_secret === undefined || base32_secret.length == 0)
			return -2;
		secret = otc_secret(base32_secret);
		if (!secret || secret === undefined || secret < 0)
			return -3;
	} else {
		secret = otc_secret(check_mfa.otc);
		if (!secret || secret === undefined || secret < 0)
			return -4;
	}
	const token = replace_data.Code;
	if (!token || token === undefined)
		return -5;
	var verified;
	try {
		verified = speakeasy.totp.verify({
			secret: secret.base32,
			encoding: 'base32',
			token
		});
	} catch (err) {
		return -6;
	}
	return verified;
}

async function create_otc(userid, response) {
	if (!userid || userid === undefined || !response || response === undefined || !userid || userid === undefined || userid === -1)
		return -1;
	const base32_secret = await get_otc_secret(userid);
	if (!base32_secret || base32_secret === undefined || base32_secret < 0)
		return -2;
	const secret = otc_secret(base32_secret);
	if (!secret || secret === undefined || secret < 0)
		return -3;
	response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	try {
		const url = await qrcode.toDataURL(secret.otpauth_url);
		response.end(JSON.stringify({ qrCodeUrl: url }));
	} catch (err) {
		response.end('Fehler beim Generieren des QR-Codes');
		return -4;
	}
	return true;
}

async function custom_code_error_checker(userid, response, replace_data) {
	if (!response || response === undefined || !replace_data || replace_data === undefined || !userid || userid === undefined || userid === -1)
		return -1;
	const check_settings = await settings_db.get_settings_value('self', userid);
	if (!check_settings || check_settings === undefined || check_settings < 0)
		return -2;
	return true;
}

async function create_custom_code(userid, response, replace_data) {
	const check_custom_error_code = custom_code_error_checker(userid, response, replace_data);
	if (!check_custom_error_code || check_custom_error_code === undefined || check_custom_error_code < 0)
		return -1;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (check_mfa < 0)
		return -2;
	const check_code = replace_data.Code;
	response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (check_code.length != 6) {
		response.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return -3;
	}
	if (isNaN(Number(check_code))) {
		response.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return -4;
	}
	if (!check_mfa || check_mfa === undefined)
		await mfa_db.create_mfa_value('', '', `${check_code}_temp`, 0, userid);
	else
		await mfa_db.update_mfa_value('custom', `${check_code}_temp`, userid);
	response.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Success"}));
	return true;
}

async function verify_custom_code(userid, response, replace_data) {
	const check_custom_error_code = custom_code_error_checker(userid, response, replace_data);
	if (!check_custom_error_code || check_custom_error_code === undefined || check_custom_error_code < 0)
		return -1;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (!check_mfa || check_mfa === undefined || check_mfa.custom.length === 0 || check_mfa < 0)
		return -2;
	let custom = check_mfa.custom;
	if (custom.endsWith('_temp'))
		custom = custom.slice(0, -5);
	if (replace_data.Code !== custom)
		return -3;
	await mfa_db.update_mfa_value('custom', custom, userid);
	if (check_mfa.prefered === 0)
		await mfa_db.update_mfa_value('prefered', 3, userid);
	return true;
}

async function create_email_code(userid, response, replace_data) {
	const check_custom_error_code = custom_code_error_checker(userid, response, replace_data);
	if (!check_custom_error_code || check_custom_error_code === undefined || check_custom_error_code < 0)
		return -1;
	const check_settings = await settings_db.get_settings_value('self', userid);
	if (!check_settings || check_settings === undefined || check_settings < 0)
		return -2;
	response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (!check_settings.email || check_settings.email === undefined) {
		response.end(JSON.stringify({"Response": "NoEmail"}));
		return -3;
	}
	var email_code = Math.floor(Math.random() * 1000000);
	const email_code_len = 6 - (String(email_code).length);
	for (var pos = 0; pos < email_code_len; pos++)
		email_code = '0' + email_code;
	const check_code = String(email_code);
	if (check_code.length != 6) {
		response.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return -4;
	}
	if (isNaN(Number(check_code))) {
		response.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return -5;
	}
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	const encrypted_code = await modules.create_encrypted_password(check_code);
	if (!check_mfa || check_mfa === undefined)
		await mfa_db.create_mfa_value('', '', `${encrypted_code}_temp`, 0, userid);
	else
		await mfa_db.update_mfa_value('email', `${encrypted_code}_temp`, userid);
	response.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Success"}));
	const check_email = await modules.send_email(check_settings.email, 'MFA code', `This is your 2FA code. Please do not share: ${check_code}`);
	if (!check_email || check_email === undefined || check_email == false) {
		await mfa_db.update_mfa_value('email', '', userid);
		return -6;
	}
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
	var fallback_options = ['email', 'otc', 'custom'];
	if (fallback_options.indexOf(search_value) < 0)
		return -1;
	response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (!check_mfa || check_mfa === undefined) {
		response.end(JSON.stringify({"Response": "Failed"}));
		return -2;
	}
	await mfa_db.update_mfa_value(`${search_value}`, '', userid);
	var found = -3;
	for (const option of fallback_options) {
		if (search_value == option)
			continue;
		console.log(check_mfa[option]);
		if (!check_mfa[option].endsWith('_temp') && check_mfa[option].length !== 0) {
			await mfa_db.update_mfa_value('prefered', fallback_options.indexOf(option) + 1, userid);
			found = true;
			break;
		}
	}
	if (!found)
		await mfa_db.update_mfa_value('prefered', 0, userid);
	response.end(JSON.stringify({"Response": "Success"}));
	return true;
}


// Ignore. dont know where to put tbh
function DOM_text(row) {
	var open_tag;
	var open_tag_name;
	var closing_tag;
	var text;
	var tag_count;
	var indent = 0;

	for (var i = 0; i < row.length; i++) {
		if (!(row[i] == ' ' || row[i] == '	')) {
			row = row.slice(i);
			break;
		}
		if (row[i] == ' ')
			indent += 1;
		else
			indent += 4;
	}
	var pos = row.indexOf('>') + 1;
	open_tag = row.slice(0, pos);
	row = row.slice(pos);
	if (open_tag.length == 0)
		return null;
	open_tag_name = open_tag;
	open_tag_name = open_tag_name.slice(1);
	for (var i = 0; i < open_tag_name.length; i++) {
		if (open_tag_name[i] == '>' || open_tag_name[i] == ' ' || open_tag_name[i] == '	') {
			open_tag_name = open_tag_name.slice(0, i);
			break;
		}
	}
	if (open_tag_name == '!DOCTYPE')
		open_tag_name = "html";
	closing_tag = `</${open_tag_name}>`;
	tag_count = row.split(closing_tag).length - 1;
	var last_index;
	for (var i = 0; i < tag_count; i++)
		last_index = row.indexOf(closing_tag, last_index + 1);
	text = row.slice(0, last_index);
	if (text[0] === '\r')
		text = text.slice(1);
	if (text[0] === '\n')
		text = text.slice(1);
	if (text[0] === '\r')
		text = text.slice(1);
	if (text[0] === '\n')
		text = text.slice(1);
	return {indent, open_tag, text, closing_tag};
}

function split_DOM_elemets(row) {
    var indent = [];
    var open_tag = [];
    var text = [];
    var closing_tag = [];
    var stopper = false;
    var autobreaker = 999999999;
    var start = 0;

    while (!stopper && start < autobreaker) {
        const returned = DOM_text(row);
        if (!returned || returned == undefined) {
            text.push(row);
            break;
        }
        indent.push(returned.indent);
        open_tag.push(returned.open_tag);
        closing_tag.push(returned.closing_tag);
        row = returned.text;
        start++;
    }
    return {indent, open_tag, text, closing_tag};
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
	clear_settings_mfa,
	DOM_text,
	split_DOM_elemets
}