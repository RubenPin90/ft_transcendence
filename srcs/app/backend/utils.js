import dotenv from 'dotenv';
import { Buffer } from 'buffer';
import * as settings_db from '../database/db_settings_functions.js';
import * as users_db from '../database/db_users_functions.js';
import * as mfa_db from '../database/db_mfa_functions.js';
import * as send from './responses.js';
import https from 'https';
import * as modules from './modules.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import * as friends_request from '../database/db_friend_request.js'
import { promises as fs, utimes } from 'fs';
import { profile } from 'console';
import * as translator from './translate.js';

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

const client_id = "120580817734-tr50q5s7mu9clbb7olk85h78tkdpsokl.apps.googleusercontent.com"; //TODO REMOVE
const client_secret = "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"; //TODO REMOVE

function google_input_handler() {
	const client_id = "120580817734-tr50q5s7mu9clbb7olk85h78tkdpsokl.apps.googleusercontent.com";
	const redirect_uri = "https://localhost/";
	const scope = "openid email profile";
	const url = `https://accounts.google.com/o/oauth2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&approval_prompt=force`;
	return url;
}
const github_client_id = "Ov23lixPpotS1gyX9qKy";
const github_client_secret = "3f6f479d39df1383e3ecae2da90da74f6fc4edcd";

function github_input_handler() {
	// const client_id = process.env.github_client_id;
	const redirect = "https://localhost/";
	const scope = "user:email";
	// const state = process.env.github_state;
	const state = generate_random_state();
	const github_string = `https://github.com/login/oauth/authorize?client_id=${github_client_id}&redirect_uri=${redirect}&scope=${scope}&state=${state}`
	return github_string;
}

async function encrypt_github(request) {
	// const client_id = process.env.github_client_id;
	const client_id = github_client_id;
	// const client_secret = process.env.github_client_secret;
	const client_secret = github_client_secret;
	const redirect = "https://localhost/";
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
	const userid_encode = modules.create_jwt(userid, '1h');
	if (db_return.self === undefined || db_return.return === undefined) {
		const lang_check = await settings_db.get_settings_value('self', userid);
		const lang_encode = modules.create_jwt(lang_check.lang, '1h');
		return {"response": "success", "token": userid_encode, "lang": lang_encode};
	}
	if (db_return < 0)
		return -8;
	const check_setting = await settings_db.get_settings_value(userid);
	if (!check_setting)
		return -9;
	const check_username = await users_db.create_users_value(0, username, userid);
	if (check_username < 0)
		return -10;
	const lang_encode = modules.create_jwt('en', '1h');
	return {"response": "success", "token": userid_encode, "lang": lang_encode};
}

async function encrypt_google(request) {
	const client_id = "120580817734-tr50q5s7mu9clbb7olk85h78tkdpsokl.apps.googleusercontent.com";
	const client_secret = "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";
	// const client_secret = process.env.google_client_secret;
	// const base_code = request;
	// const sliced_code = base_code.slice(6);
	// if (!sliced_code || sliced_code === undefined || sliced_code.length == 0)
		// return -1;
	// const subbed_code = sliced_code.substring(0, sliced_code.indexOf("&scope"));
	// if (!subbed_code || subbed_code === undefined || subbed_code.length == 0)
		// return -2;
	// const code = subbed_code.replace("%2F", "/");
	// if (!code || code === undefined || code == subbed_code)
		// return -3;
	const code = request;
	
	try {
		const header = {"Accept": 'application/json', "Content-Type": 'application/json'};
		const body = JSON.stringify({'code': code, 'client_id': client_id, 'client_secret': client_secret, 'redirect_uri': 'https://localhost/', 'grant_type': 'authorization_code'})
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
		const userid_encode = modules.create_jwt(userid, '1h');
		if (db_return.self === undefined || db_return.return === undefined) {
			const lang_check = await settings_db.get_settings_value('self', userid);
			const lang_encode = modules.create_jwt(lang_check.lang, '1h');
			return {"response": "success", "token": userid_encode, "lang": lang_encode};
		}
		if (db_return < 0)
			return -9;
		const check_setting = await settings_db.get_settings_value('self', userid);
		if (!check_setting || check_setting === undefined || check_setting < 0)
			return -10;
		const check_username = await users_db.create_users_value(0, username, userid);
		if (!check_username || check_username === undefined || check_username < 0)
			return -11;
		const lang_encode = modules.create_jwt('en', '1h');
		return {"response": "success", "token": userid_encode, "lang": lang_encode};
	} catch (error) {
		console.error("Error during Google OAuth:", error);
		return -12;
	}
}

function generate_random_state(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let state = '';
    for (let i = 0; i < length; i++) {
        state += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return state;
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
	const data = request.body;
	const check_settings = await settings_db.get_settings_value('email', data.email);
	if (!check_settings || check_settings === undefined || check_settings < 0) {

		response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
		response.raw.end(JSON.stringify({"Response": 'Email not found', "Content": null}));
		return -1;
	}
	const pw = await modules.check_encrypted_password(data.password, check_settings.password);
	if (!pw || pw === undefined || pw < 0) {
		response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
		response.raw.end(JSON.stringify({"Response": 'Password incorrect', "Content": null}));
		return -2;
	}
	const mfa = await mfa_db.get_mfa_value('self', check_settings.self);
	if (!mfa || mfa === undefined || mfa < 0 || ((mfa.otc && mfa.otc.endsWith('_temp')) && (mfa.email && mfa.email.endsWith('_temp')) && (mfa.custom && mfa.custom.endsWith('_temp')) ))
		return {'settings': check_settings, 'mfa': null};
	return {'settings': check_settings, 'mfa': mfa};
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

function get_decrypted_userid(request, response) {
	const [keys, values] = modules.get_cookies(request);
	if (keys === null && values === null)
		return -1;
	try {
		var self_decoded = modules.get_jwt(values[keys.indexOf('token')]);
	} catch (err) {
		const err_string = String(err);
		//console.log(err_string);
		if (err_string.includes("jwt expired")) {
			response.raw.writeHead(302, {
				'Set-Cookie': 'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
				'Location': '/login'
			});
			response.raw.end();
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
	response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	try {
		const url = await qrcode.toDataURL(secret.otpauth_url);
		response.raw.end(JSON.stringify({ qrCodeUrl: url }));
	} catch (err) {
		response.raw.end('Fehler beim Generieren des QR-Codes');
		return -4;
	}
	return true;
}

async function custom_code_error_checker(userid, response) {
	if (!response || response === undefined || !userid || userid === undefined || userid === -1)
		return -1;
	const check_settings = await settings_db.get_settings_value('self', userid);
	if (!check_settings || check_settings === undefined || check_settings < 0)
		return -2;
	return true;
}

async function create_custom_code(userid, response, data) {
	const check_custom_error_code = custom_code_error_checker(userid, response);
	if (!check_custom_error_code || check_custom_error_code === undefined || check_custom_error_code < 0)
		return -1;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (check_mfa < 0)
		return -2;
	const check_code = data.Code;
	response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (check_code.length != 6) {
		response.raw.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return -3;
	}
	if (isNaN(Number(check_code))) {
		response.raw.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return -4;
	}
	if (!check_mfa || check_mfa === undefined)
		await mfa_db.create_mfa_value('', '', `${check_code}_temp`, 0, userid);
	else
		await mfa_db.update_mfa_value('custom', `${check_code}_temp`, userid);
	response.raw.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Success"}));
	return true;
}

async function verify_custom_code(userid, response, data) {
	const check_custom_error_code = custom_code_error_checker(userid, response);
	response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (!check_custom_error_code || check_custom_error_code === undefined || check_custom_error_code < 0)
		return -1;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (!check_mfa || check_mfa === undefined || check_mfa.custom.length === 0 || check_mfa < 0)
		return -2;
	let custom = check_mfa.custom;
	if (custom.endsWith('_temp'))
		custom = custom.slice(0, -5);
	if (data.Code !== custom) {
		response.raw.end(JSON.stringify({"Response": 'Wrong password', "Content": null}));
		return -3;
	}
	await mfa_db.update_mfa_value('custom', custom, userid);
	if (check_mfa.prefered === 0)
		await mfa_db.update_mfa_value('prefered', 3, userid);
	response.raw.end(JSON.stringify({"Response": 'success', "Content": null}));
	return true;
}

async function create_email_code(userid, response, replace_data) {
	const check_custom_error_code = custom_code_error_checker(userid, response, replace_data);
	if (!check_custom_error_code || check_custom_error_code === undefined || check_custom_error_code < 0)
		return -1;
	const check_settings = await settings_db.get_settings_value('self', userid);
	if (!check_settings || check_settings === undefined || check_settings < 0)
		return -2;
	response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (!check_settings.email || check_settings.email === undefined) {
		response.raw.end(JSON.stringify({"Response": "NoEmail"}));
		return -3;
	}
	var email_code = Math.floor(Math.random() * 1000000);
	const email_code_len = 6 - (String(email_code).length);
	for (var pos = 0; pos < email_code_len; pos++)
		email_code = '0' + email_code;
	const check_code = String(email_code);
	if (check_code.length != 6) {
		response.raw.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return -4;
	}
	if (isNaN(Number(check_code))) {
		response.raw.end(JSON.stringify({"Response": 'send_custom_verification', "Response": "Failed"}));
		return -5;
	}
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	const encrypted_code = await modules.create_encrypted_password(check_code);
	if (!check_mfa || check_mfa === undefined)
		await mfa_db.create_mfa_value(`${encrypted_code}_temp`, '', '', 0, userid);
	else
		await mfa_db.update_mfa_value('email', `${encrypted_code}_temp`, userid);
	response.raw.end(JSON.stringify({"Response": 'success'}));
	const check_email = await modules.send_email(check_settings.email, 'MFA code', `This is your 2FA code. Please do not share: ${check_code}`);
	if (!check_email || check_email === undefined || check_email == false) {
		await mfa_db.update_mfa_value('email', '', userid);
		return -6;
	}
	return true;
}

async function verify_email_code(userid, response, data) {
	if (await custom_code_error_checker(userid, response) === false)
		return false;
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (check_mfa === undefined || check_mfa === null || check_mfa.email.length === 0)
		return false;
	var email_value = check_mfa.email;
	if (email_value.endsWith('_temp'))
		email_value = email_value.slice(0, -5);
	const decrypted_email_value = await modules.check_encrypted_password(data.Code, email_value);
	response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (decrypted_email_value === false) {
		response.raw.end(JSON.stringify({"Response": "Failed"}));
		return false;
	}
	await mfa_db.update_mfa_value('email', email_value, userid);
	if (check_mfa.prefered === 0)
		await mfa_db.update_mfa_value('prefered', 1, userid);
	response.raw.end(JSON.stringify({"Response": "success"}));
	return true;
}

async function clear_settings_mfa(userid, search_value, response) {
	var fallback_options = ['email', 'otc', 'custom'];
	if (fallback_options.indexOf(search_value) < 0)
		return -1;
	response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	const check_mfa = await mfa_db.get_mfa_value('self', userid);
	if (!check_mfa || check_mfa === undefined) {
		response.raw.end(JSON.stringify({"Response": "Failed"}));
		return -2;
	}
	await mfa_db.update_mfa_value(`${search_value}`, '', userid);
	var found = -3;
	for (const option of fallback_options) {
		if (search_value == option)
			continue;
		//console.log(check_mfa[option]);
		if (!check_mfa[option].endsWith('_temp') && check_mfa[option].length !== 0) {
			await mfa_db.update_mfa_value('prefered', fallback_options.indexOf(option) + 1, userid);
			found = true;
			break;
		}
	}
	if (!found)
		await mfa_db.update_mfa_value('prefered', 0, userid);
	response.raw.end(JSON.stringify({"Response": "Success"}));
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

async function replace_all_templates(request, response, state) {
	const github_login = github_input_handler();
	const google_login = google_input_handler();

	const friends_html_raw = await fs.readFile("./backend/templates/friends.html", 'utf8');
	// const friends_html = friends_html_raw.replace('{{FRIEND_REQUESTS}}', await friends_request.show_pending_requests(userid));
	const home_html_raw = await fs.readFile("./backend/templates/home.html", 'utf8');
	const login_html_raw = await fs.readFile("./backend/templates/login.html", 'utf8');
	var login_html = login_html_raw.replace("{{google_login}}", google_login);
	login_html = login_html.replace("{{github_login}}", github_login);
	const register_html_raw = await fs.readFile("./backend/templates/register.html", 'utf8');
	var register_html = register_html_raw.replace("{{google_login}}", google_login);
	register_html = register_html.replace("{{github_login}}", github_login);
	const profile_html_raw = await fs.readFile("./backend/templates/profile.html", 'utf8');
	const settings_html_raw = await fs.readFile("./backend/templates/settings.html", 'utf8');

	var settings_html_default_string = "";
	settings_html_default_string += '<div id="settings_main_div" class="hidden">';
	settings_html_default_string += '<div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>'
	settings_html_default_string += '<div class="flex flex-col gap-6"><a class="buttons" href="/settings/mfa" data-link>';
	settings_html_default_string += '<button class="block w-full mb-6 mt-6">';
	settings_html_default_string += '<span class="button_text">MFA</span>';
	settings_html_default_string += '</button></a>';
	settings_html_default_string += '<a class="buttons" href="/settings/user" data-link>';
	settings_html_default_string += '<button class="block w-full mb-6 mt-6">';
	settings_html_default_string += '<span class="button_text">User</span>';
	settings_html_default_string += '</button></a></div>';
	settings_html_default_string += '<div class="flex mt-12 gap-4 w-full">';
	settings_html_default_string += '<a class="flex-1" href="/" data-link>';
	settings_html_default_string += '<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	settings_html_default_string += '<span class="button_text">Back</span>';
	settings_html_default_string += '</button></a>';
	settings_html_default_string += '<a href="/" class="flex-1" data-link>';
	settings_html_default_string += '<button class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	settings_html_default_string += '<span class="button_text">Home</span>';
	settings_html_default_string += '</button></a></div></div></div></div></div>';
	const settings_html_default = settings_html_raw.replace("{{mfa-button}}", settings_html_default_string);

	var settings_html_mfa_string = "";

	settings_html_mfa_string += '<div id="mfa_div" class="hidden">';
	settings_html_mfa_string += '<div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>';

	settings_html_mfa_string += '<div id="mfa"></div>'
    settings_html_mfa_string += '<div id="mfa-button">'

    settings_html_mfa_string +='<div class="flex gap-2">'
    settings_html_mfa_string +='<form id="mfa_options" class="w-5/6">'
    settings_html_mfa_string +='<select name="lang" id="select_mfa" class="w-full p-4 text-center rounded-xl text-2xl border border-[#e0d35f] border-spacing-8 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f]">'
    settings_html_mfa_string +='<option value="" selected disabled hidden>Choose your main 2FA</option>'
    settings_html_mfa_string +='{{2FAOPTIONS}}'
    settings_html_mfa_string +='</select></form>'
    settings_html_mfa_string +='<div class="flex items-center justify-center w-1/6 mb-6 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] border-black border border-spacing-5 rounded-xl cursor-pointer">'
    settings_html_mfa_string +='<button onclick="change_preffered_mfa()">'
    settings_html_mfa_string +='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-16">'
    settings_html_mfa_string +='<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />'
    settings_html_mfa_string +='</svg></button></div></div>'
	settings_html_mfa_string +='';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div class="flex gap-2">';
	settings_html_mfa_string +='<div class="buttons mb-6 w-5/6" onclick="create_otc()">';
	settings_html_mfa_string +='<button class="block w-full mb-6 mt-6">';
	settings_html_mfa_string +='<span class="button_text">Create OTC</span></button></div>';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div id="trash_otc" class="trash_disable">';
	settings_html_mfa_string +='<button id="trash_otc_button" class="pointer-events-none">';
	settings_html_mfa_string +='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-16">';
	settings_html_mfa_string +='<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></button></div></div>';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div class="flex gap-2">';
	settings_html_mfa_string +='<div class="buttons mb-6 w-5/6" onclick="create_custom_code()">';
	settings_html_mfa_string +='<button class="block w-full mb-6 mt-6">';
	settings_html_mfa_string +='<span class="button_text">Create custom 6 digit code</span></button></div>';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div id="trash_custom" class="trash_enable">';
	settings_html_mfa_string +='<button id="trash_custom_button" class="pointer-events-none">';
	settings_html_mfa_string +='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-16">';
	settings_html_mfa_string +='<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></button></div></div>';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div class="flex gap-2">';
	settings_html_mfa_string +='<div class="buttons mb-6 w-5/6" onclick="create_email()">';
	settings_html_mfa_string +='<button class="block w-full mb-6 mt-6">';
	settings_html_mfa_string +='<span class="button_text">Enable email authentication</span></button></div>';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div id="trash_email" class="trash_disable">';
	settings_html_mfa_string +='<button id="trash_email_button" class="pointer-events-none">';
	settings_html_mfa_string +='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-16">';
	settings_html_mfa_string +='<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />';
	settings_html_mfa_string +='</svg></button></div></div>';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='';
	settings_html_mfa_string +='<div class="flex mt-12 gap-4 w-full">';
	settings_html_mfa_string +='<a class="flex-1" href="/settings" data-link>';
	settings_html_mfa_string +='<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	settings_html_mfa_string +='<span class="font-bold text-lg">Back</span>';
	settings_html_mfa_string +='</button></a>';
	settings_html_mfa_string +='<a href="/" class="flex-1" data-link>';
	settings_html_mfa_string +='<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	settings_html_mfa_string +='<span class="font-bold text-lg">Home</span>';
	settings_html_mfa_string +='</button></a></div></div></div></div></div></div>';


	// settings_html_mfa_string += '<div id="mfa_div" class="hidden">';
	// settings_html_mfa_string += '<div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>';
	// settings_html_mfa_string += '<div class="buttons mb-6" onclick="create_otc()">';
	// settings_html_mfa_string += '<button class="block w-full mb-6 mt-6">';
	// settings_html_mfa_string += '<span class="button_text">Create OTC</span>';
	// settings_html_mfa_string += '</button></div>';
	// settings_html_mfa_string += '<div class="buttons mb-6" onclick="create_custom_code()">';
	// settings_html_mfa_string += '<button class="block w-full mb-6 mt-6">';
	// settings_html_mfa_string += '<span class="button_text">Create custom 6 diggit code</span>';
	// settings_html_mfa_string += '</button></div>';
	// settings_html_mfa_string += '<div class="buttons mb-6" onclick="create_email()">';
	// settings_html_mfa_string += '<button class="block w-full mb-6 mt-6">';
	// settings_html_mfa_string += '<span class="button_text">Enable email authentication</span>';
	// settings_html_mfa_string += '</button></div>';
	// settings_html_mfa_string += '<div class="flex mt-12 gap-4 w-full">';
	// settings_html_mfa_string += '<a class="flex-1" href="/settings" data-link>';
	// settings_html_mfa_string += '<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	// settings_html_mfa_string += '<span class="font-bold text-lg">Back</span>';
	// settings_html_mfa_string += '</button></a>';
	// settings_html_mfa_string += '<a href="/" class="flex-1" data-link>';
	// settings_html_mfa_string += '<button class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	// settings_html_mfa_string += '<span class="font-bold text-lg">Home</span>';
	// settings_html_mfa_string += '</button></a></div></div></div></div></div>';
	const settings_html_mfa = settings_html_raw.replace("{{mfa-button}}", settings_html_mfa_string);

	var settings_html_user_string = "";
	settings_html_user_string += '<div id="lang_prof_div" class="hidden">';
	settings_html_user_string += '<div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>';
	settings_html_user_string += '<div><a href="/settings/user/select_language" data-link><div class="buttons mb-6"></div></a>';
	settings_html_user_string += '<button class="block w-full mb-6 mt-6">';
	settings_html_user_string += '<span class="button_text">Select Language</span>';
	settings_html_user_string += '</button></div>';
	settings_html_user_string += '<div><a href="/settings/user" data-link><div class="buttons mb-6"></div></a>';
	settings_html_user_string += '<button class="block w-full mb-6 mt-6">';
	settings_html_user_string += '<span class="button_text">Profile changes</span>';
	settings_html_user_string += '</button></div>';
	settings_html_user_string += '<div class="flex mt-12 gap-4 w-full">';
	settings_html_user_string += '<a class="flex-1" href="/settings" data-link>';
	settings_html_user_string += '<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	settings_html_user_string += '<span class="button_text">Back</span>';
	settings_html_user_string += '</button></a>';
	settings_html_user_string += '<a class="flex-1">';
	settings_html_user_string += '<button onclick="logout()" class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">';
	settings_html_user_string += '<span class="button_text">Logout</span>';
	settings_html_user_string += '</button></a></div></div></div></div></div>';
	const settings_html_user = settings_html_raw.replace("{{mfa-button}}", settings_html_user_string);


	var settings_html_user_select_language_string = "";
	settings_html_user_select_language_string += '<div id="lang_div" class="hidden">';
	settings_html_user_select_language_string += '<div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>';

	settings_html_user_select_language_string += '<button onclick="change_language()">Change language</button>';
	settings_html_user_select_language_string += `
	<form id="language">
		<select name="lang" id="lang">
			<option value="" selected disabled hidden>Choose your main language</option>
			<option value="af">Afrikaans</option>
			<option value="az">Azərbaycanca</option>
			<option value="id">Bahasa Indonesia</option>
			<option value="ms">Bahasa Melayu</option>
			<option value="jw">Basa Jawa</option>
			<option value="su">Basa Sunda</option>
			<option value="bs">Bosanski</option>
			<option value="ca">Català</option>
			<option value="ceb">Cebuano</option>
			<option value="sn">ChiShona</option>
			<option value="ny">Chichewa</option>
			<option value="co">Corsu</option>
			<option value="cy">Cymraeg</option>
			<option value="da">Dansk</option>
			<option value="de">Deutsch</option>
			<option value="et">Eesti</option>
			<option value="en">English</option>
			<option value="es">Español</option>
			<option value="eo">Esperanto</option>
			<option value="eu">Euskara</option>
			<option value="fr">Français</option>
			<option value="fy">Frysk</option>
			<option value="ga">Gaeilge</option>
			<option value="sm">Gagana Samoa</option>
			<option value="gl">Galego</option>
			<option value="gd">Gàidhlig</option>
			<option value="ha">Hausa</option>
			<option value="hmn">Hmoob</option>
			<option value="hr">Hrvatski</option>
			<option value="ig">Igbo</option>
			<option value="it">Italiano</option>
			<option value="sw">Kiswahili</option>
			<option value="ht">Kreyòl Ayisyen</option>
			<option value="ku">Kurdî</option>
			<option value="la">Latina</option>
			<option value="lv">Latviešu</option>
			<option value="lt">Lietuvių</option>
			<option value="lb">Lëtzebuergesch</option>
			<option value="hu">Magyar</option>
			<option value="mg">Malagasy</option>
			<option value="mt">Malti</option>
			<option value="mi">Māori</option>
			<option value="nl">Nederlands</option>
			<option value="no">Norsk</option>
			<option value="uz">Oʻzbekcha</option>
			<option value="pl">Polski</option>
			<option value="pt">Português</option>
			<option value="ro">Română</option>
			<option value="st">Sesotho</option>
			<option value="sq">Shqip</option>
			<option value="sk">Slovenčina</option>
			<option value="sl">Slovenščina</option>
			<option value="so">Soomaali</option>
			<option value="fi">Suomi</option>
			<option value="sv">Svenska</option>
			<option value="tl">Tagalog</option>
			<option value="vi">Tiếng Việt</option>
			<option value="tr">Türkçe</option>
			<option value="yo">Yorùbá</option>
			<option value="xh">isiXhosa</option>
			<option value="zu">isiZulu</option>
			<option value="is">Íslenska</option>
			<option value="cs">Čeština</option>
			<option value="haw">ʻŌlelo Hawaiʻi</option>
			<option value="el">Ελληνικά</option>
			<option value="be">Беларуская</option>
			<option value="bg">Български</option>
			<option value="ky">Кыргызча</option>
			<option value="mk">Македонски</option>
			<option value="mn">Монгол</option>
			<option value="ru">Русский</option>
			<option value="sr">Српски</option>
			<option value="tg">Тоҷикӣ</option>
			<option value="uk">Українська</option>
			<option value="kk">Қазақша</option>
			<option value="hy">Հայերեն</option>
			<option value="yi">ייִדיש</option>
			<option value="iw">עברית</option>
			<option value="ur">اردو</option>
			<option value="ar">العربية</option>
			<option value="sd">سنڌي</option>
			<option value="fa">فارسی</option>
			<option value="ps">پښتو</option>
			<option value="ne">नेपाली</option>
			<option value="mr">मराठी</option>
			<option value="hi">हिन्दी</option>
			<option value="bn">বাংলা</option>
			<option value="gu">ગુજરાતી</option>
			<option value="ta">தமிழ்</option>
			<option value="te">తెలుగు</option>
			<option value="kn">ಕನ್ನಡ</option>
			<option value="ml">മലയാളം</option>
			<option value="si">සිංහල</option>
			<option value="th">ไทย</option>
			<option value="lo">ລາວ</option>
			<option value="my">မြန်မာ</option>
			<option value="ka">ქართული</option>
			<option value="km">ភាសាខ្មែរ</option>
			<option value="ja">日本語</option>
			<option value="zh-cn">简体中文</option>
			<option value="zh-tw">繁體中文</option>
			<option value="ko">한국어</option>
		</select>
		<button type="submit">Submit</button>
	</form>`
	settings_html_user_select_language_string += '<div class="flex mt-12 w-1/2">';
	settings_html_user_select_language_string += '<a href="/settings" class="flex-1" data-link>';
	settings_html_user_select_language_string += '<button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full"><span class="font-bold text-lg">Back</span></button></a>';
	settings_html_user_select_language_string += `<a href="/" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Home</span>
            </button>
        </a>`;
	settings_html_user_select_language_string += '';
	settings_html_user_select_language_string += '';
	settings_html_user_select_language_string += ' \
	</div></div></div></div>';
	const settings_html_user_select_language_raw = settings_html_raw.replace("{{mfa-button}}", settings_html_user_select_language_string);

	var settings_html_user_profile_settings_string = "";
	settings_html_user_profile_settings_string += '<div id="user_prof_div" class="hidden">';
	settings_html_user_profile_settings_string += '<div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>';

	settings_html_user_profile_settings_string += `
	<div class="flex flex-col mt-8 gap-6">
        <a href="/settings/user/change_user" class="buttons" data-link>
            <button class="block w-full mb-4 mt-6">
                <span class="button_text">change username</span>
            </button>
        </a>
        <a href="/settings/user/change_login" class="buttons" data-link>
            <button class="block w-full mb-4 mt-6">
                <span class="button_text">change login data</span>
            </button>
        </a>
        <a href="/settings/user/change_avatar" class="buttons" data-link>
            <button class="block w-full mb-4 mt-6">
                <span class="button_text">change avatar</span>
            </button>
        </a>
		<a class="delete_button">
			<button class="block w-full mb-4 mt-6" onclick="delete_account()">
				<span class="button_text">Delete account</span>
			</button>
		</a>
    </div>
    <div class="flex mt-12 gap-4 w-full">
		<a href="/settings" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Back</span>
            </button>
        </a>
        <a href="/" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Home</span>
            </button>
        </a>
    </div></div></div></div></div>`
	const settings_html_user_profile_settings_raw = settings_html_raw.replace("{{mfa-button}}", settings_html_user_profile_settings_string);

	const settings_html_user_profile_username_string = `<div id="username_div" class="hidden"><div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>
	<div id="user_field" class="relative input_total">
        <div class="input_svg">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" />
                </svg>
        </div>
        <input type="text" id="username_sett" placeholder="Username" required class="input_field" />
    </div>
    <div class="flex mt-12 gap-4 w-full">
        <a class="flex-1">
            <button onclick="change_user()" class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Submit</span>
            </button>
        </a>
        <a href="/settings/user" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Back</span>
            </button>
        </a>
    </div></div></div></div></div></div>
	`
	var settings_html_user_profile_username_raw = settings_html_raw.replace("{{mfa-button}}", settings_html_user_profile_username_string);


	const settings_html_user_profile_credential_string = `<div id="userpass_div" class="hidden"><div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>
	<label for="email" class="label_text">Email</label>
    <div id="email_field" class="relative input_total">
        <div class="input_svg">
            <svg class="w-6 h-6 text-gray-500 justify-center" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 16">
                <path d="m10.036 8.278 9.258-7.79A1.979 1.979 0 0 0 18 0H2A1.987 1.987 0 0 0 .641.541l9.395 7.737Z"/>
                <path d="M11.241 9.817c-.36.275-.801.425-1.255.427-.428 0-.845-.138-1.187-.395L0 2.6V14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2.5l-8.759 7.317Z"/>
            </svg>
        </div>
        <input type="text" id="email_change" placeholder="example@gmail.com" required class="input_field" />
    </div>
    <label for="password-input" class="label_text">Password</label>
    <div id="password_field" class="relative input_total">
        <div class="input_svg">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path fill-rule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clip-rule="evenodd" />
            </svg>
        </div>
        <button onclick="toggle_eye(1)" id="password_eye" class="password_eye" tabindex="-1">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
                <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />
                <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" />
                </svg>
        </button>
        <input type="password" id="password_input_change" placeholder="Password" required class="input_field" />
    </div>
    <label for="password-input2" class="label_text">Repeat Password</label>
    <div id="repeat_field" class="relative input_total">
        <div class="input_svg">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path fill-rule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clip-rule="evenodd" />
            </svg>
        </div>
        <button onclick="toggle_eye(2)" id="password_eye2" class="password_eye" tabindex="-1">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
                <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />
                <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" />
            </svg>
        </button>
        <input type="password" id="password_input2_change" placeholder="Repeat password" required class="input_field" />
    </div>
    <div class="flex mt-12 gap-4 w-full">
        <a class="flex-1">
            <button onclick="change_logindata()" id="submit_button" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Submit</span>
            </button>
        </a>
        <a href="/settings/user" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Back</span>
            </button>
        </a>
    </div></div></div></div></div>
	`;
	const settings_html_user_profile_credential_raw = settings_html_raw.replace("{{mfa-button}}", settings_html_user_profile_credential_string);

	
	const settings_html_user_profile_avatar_string = `<div id="useravatar_div" class="hidden"><div class="min-h-screen flex items-center justify-center px-4 py-10"><div class="field"><div>
	<div class="to-[#d16e1d] from-[#e0d35f] bg-gradient-to-br rounded-lg">
        <label class="pl-2 block mb-2 font-medium text-gray-900 text-2xl" for="file_input">Upload file</label>
        <input class="block w-full text-sm text-gray-900 border border-[#e0d35f] to-[#d16e1d] from-[#e0d35f] bg-gradient-to-br  rounded-lg cursor-pointer" id="file_input" type="file">
    </div>
    <div class="flex mt-12 gap-4 w-full">
        <a class="flex-1">
            <button onclick="change_avatar()" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Submit</span>
            </button>
        </a>
        <a href="/settings/user" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Back</span>
            </button>
        </a>
    </div></div></div></div></div>
	`;
	const settings_html_user_profile_avatar_raw = settings_html_raw.replace("{{mfa-button}}", settings_html_user_profile_avatar_string);

	// const play_raw = await fs.readFile("./backend/templates/game.html", 'utf8');

	const play_raw = await fs.readFile("./backend/templates/play.html", 'utf8');

	// play.ts (or wherever you build the template HTML)

	let play_main = "";
		play_main +=   '<div class="min-h-screen flex items-center justify-center px-4 py-10">';
		play_main +=     '<div id="login-container" class="field">';
		play_main +=       '<div id="main-menu">';
		play_main +=         '<h1>Welcome, <span id="username">{{uname}}</span>!</h1>';
		play_main +=         '<button id="sp-vs-pve-btn">PVE</button>';
		play_main +=         '<button id="one-vs-one-btn">1v1 Matchmaking</button>';
		play_main +=         '<button id="tournament-btn">Tournament</button>';
		play_main +=       '</div>';

		play_main +=       '<div id="game-container" hidden>';
		play_main +=         '<h2 id="game-mode-title"></h2>';
		play_main +=         '<canvas id="game" width="800" height="600"></canvas>';
		play_main +=       '</div>';

		play_main +=       '<div id="matchmaking-page" hidden class="matchmaking">';
		play_main +=         '<h2>Searching for an opponent…</h2>';
		play_main +=         '<div id="matchmaking-spinner" class="spinner"></div>';
		play_main +=       '</div>';

		play_main +=       '<div id="tournament-page" hidden>';
		play_main +=         '<h2 style="text-align:center;margin-bottom:2.5rem">Tournaments</h2>';
		play_main +=         '<div class="tournament-layout">';
		play_main +=           '<div style="display:flex;gap:1rem;margin-bottom:2rem">';
		play_main +=             '<input id="t-code-input" class="full-btn" placeholder="Enter a Tournament code here" style="flex:1;height:100px">';
		play_main +=             '<button id="t-code-btn" class="full-btn" style="width:180px;height:100px">Join<br>by&nbsp;code</button>';
		play_main +=           '</div>';
		play_main +=           '<div style="margin-bottom:2rem;text-align:center">';
		play_main +=             '<button id="t-create-btn" class="full-btn" style="width:240px;height:60px;font-size:1.2rem">Create&nbsp;Tournament</button>';
		play_main +=           '</div>';
		play_main +=           '<div class="t-right" id="tournament-list"></div>';
		play_main +=         '</div>';
		play_main +=       '</div>';

		play_main +=       '<div id="t-lobby-page" hidden>';
		play_main +=         '<h2 id="t-lobby-status" style="text-align:center;margin-bottom:1.5rem">Waiting for players…</h2>';
		play_main +=         '<div id="t-lobby-table" class="TLobby-table"></div>';
		play_main +=         '<div class="code-box">';
		play_main +=           '<input id="t-share-code" readonly>';
		play_main +=           '<button id="t-copy-code-btn" title="Copy code to clipboard"></button>';
		play_main +=         '</div>';
		play_main +=         '<div id="host-controls">';
		play_main +=           '<button id="t-start-btn" class="full-btn" style="width:320px;height:80px;font-size:1.5rem">START</button>';
		play_main +=         '</div>';
		play_main +=         '<div id="player-controls">';
		play_main +=           '<button id="t-ready-btn" class="full-btn" style="width:320px;height:80px;font-size:1.5rem">READY</button>';
		play_main +=           '<span id="t-my-ready-dot" class="green-dot"></span>';
		play_main +=         '</div>';
		play_main +=         '<div style="display:flex;justify-content:space-between">';
		play_main +=           '<button id="t-leave-btn" class="square-btn">Leave</button>';
		play_main +=           '<button id="t-custom-btn" class="square-btn">Customization</button>';
		play_main +=         '</div>';
		play_main +=       '</div>';

		play_main +=       '<div id="bracket-overlay" class="bracket-overlay" hidden>';
		play_main +=         '<button id="bracket-begin-btn" class="bracket-begin-btn" hidden>Begin round&nbsp;1</button>';
		play_main +=       '</div>';

		play_main +=       '<template id="match-card-tpl">';
		play_main +=         '<div class="match-card">';
		play_main +=           '<div class="p1"></div>';
		play_main +=           '<div class="vs">vs</div>';
		play_main +=           '<div class="p2"></div>';
		play_main +=         '</div>';
		play_main +=       '</template>';

		play_main +=     '</div>'; // login-container
		play_main +=   '</div>';   // flex container


	const index_html_raw = await fs.readFile("./backend/templates/index.html", 'utf8')

	if (state == 1) {
		var final_string = login_html;
		final_string += register_html;
		return index_html_raw.replace("{{replace}}", final_string);
	}
	var index_html = home_html_raw;
	index_html += profile_html_raw;
	index_html += settings_html_default;
	index_html += settings_html_mfa;
	index_html += settings_html_user;
	index_html += settings_html_user_select_language_raw;
	index_html += settings_html_user_profile_settings_raw;
	index_html += settings_html_user_profile_username_raw;
	index_html += settings_html_user_profile_credential_raw;
	index_html += settings_html_user_profile_avatar_raw;
	index_html += friends_html_raw;
	// index_html += menu_raw;
	// index_html += game_raw;
	const [keys, values] = modules.get_cookies(request);
	// const user_encrypt = modules.get_jwt(values[0]);
	// const lang_encrypt = modules.get_jwt(values[1]);
	if (keys?.includes('lang')) {
		const lang_encoded = values[keys.indexOf('lang')];
		const lang_decrypted = modules.get_jwt(lang_encoded);
		if (lang_decrypted.userid != "en")
			index_html = await translator.cycle_translations(index_html, lang_decrypted.userid);
	}
	const token = values[keys.indexOf('token')];
	if (!token)
		throw new Error("Token is not defined!");
	const user_decrypted = modules.get_jwt(token);
	const check_user = await users_db.get_users_value('self', user_decrypted.userid);
	index_html = index_html.replace("{{userid}}", check_user.username.toString());
	return index_html_raw.replace("{{replace}}", index_html.toString());
}

function show_page(data, tag_name) {
	const available = ['change_avatar_div', 'user_settings_div', 'register_div', 'profile_div', 'menu_div', 'login_div', 'home_div', 'game_div', 'friends_div', 'change_user_div', 'change_login_div']
	
	var page = data;
	available.forEach((element) => {
		var find_tag = `<div id=\"${element}\">`;
		var hide_tag = `<div id=\"${element}\" class="hidden">`;
		page = page.replace(find_tag, hide_tag);
	});

	const search_tag = `<div id=\"${tag_name}\" class="hidden">`;
	const replace_tag = `<div id=\"${tag_name}\">`;
	page = page.replace(search_tag, replace_tag);
	return page;
}


async function get_data(request, response) {
	try {
		const link = request.body;
		if (link.get == "{{userid}}") {
			const userid_decrypted = modules.get_jwt(link.search);
			const search_user = await users_db.get_users_value('self', userid_decrypted.userid);
			return response.code(200).send({ "username": search_user.username });
		} else if (link.get == "cookies") {
			const [keys, values] = modules.get_cookies(request, response);
			if (keys.length == 0 && values.length == 0 || keys == null && values == null)
				return response.code(200).send({'content': "empty"});
			return response.code(200).send({'content': "full"});
		} else if (link.get == "username") {
			const [keys, values] = modules.get_cookies(request, response);
			if (keys.length == 0 && values.length == 0)
				return response.code(200).send({'content': "empty"});
			const username = modules.get_jwt(values[keys.indexOf('token')]);
			const check_user = await users_db.get_users_value('self', username.userid);
			return response.code(200).send({'username': check_user.username});
		} else if (link.get == "site_content") {
			const data = await replace_all_templates(request, response);
			response.raw.writeHead(200, {'Content-Type': 'application/json'});
			response.raw.end(JSON.stringify({"Response": 'success', "Content": show_page(data, "home_div")}));
			return true;
		}
		response.raw.writeHead(404, {'Content-Type': 'application/json'});
		response.raw.end(JSON.stringify({"Response": 'Not found', "Content": null}));
		return true; //or false idk
		// return response.code(404).send({ "error": "Not found" });
	} catch (err) {
      	console.error('Error:', err);
		response.raw.writeHead(500, {'Content-Type': 'application/json'});
		response.raw.end(JSON.stringify({"Response": 'fail', "Content": null}));
      	// return response.code(500).send({ "response": 'fail' });
		return true; //or false idk
    }
}


// async function temp(request, response){
// 	const body = request.body;


// }




export {
	google_input_handler,
	github_input_handler,
	encrypt_google,
	encrypt_github,
	process_login,
	get_frontend_content,
	otc_secret,
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
	split_DOM_elemets,
	replace_all_templates,
	show_page,
	get_data,
	generate_random_state
}