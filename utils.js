require('dotenv').config()
const { Buffer } = require('buffer');
const settings_db = require('./database/db_settings_functions');
const users_db = require('./database/db_users_functions');
const https = require('https');
const modules = require('./modules');
const { callbackify } = require('util');

const max_loop_size = 10000000000;


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
	return sliced;
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
		if (!db_return)
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

module.exports = {
	google_input_handler,
	encrypt_google,
	process_login,
	get_settings_content,
	max_loop_size
}