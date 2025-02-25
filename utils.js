require('dotenv').config()
const { Buffer } = require('buffer');
const db = require('./database/db_user_functions');
const https = require('https');
const modules = require('./modules')

async function create_username(email) {
	const pos = email.indexOf('@');
	var sliced = email.slice(0, pos);
	sliced = sliced.replace('.', '-');
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
		
		const id_token = token_data.id_token;
		const decoded_id_token = await decodeJWT(id_token);
		const user_id = decoded_id_token.sub;
		const email = decoded_id_token.email;
		const pfp = decoded_id_token.picture;
		const username = await create_username(email);
		await db.create_user(email, username, 'test', pfp, user_id, 0, user_id);
		await db.show_user();
		return user_id;
	} catch (error) {
		console.error("Error during Google OAuth:", error);
	}
	return 0;
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
	request.on('data', async (chunk) => {
		body += chunk.toString();
	});
	request.on('end', async () => {
		body = JSON.parse(body).email;
		const email = await db.is_email(body);
		if (!email)
			console.log("Email not found");
		else {
			const temp = await db.get_password(body);
			if (!temp)
				console.log("No password found");
			else {
				const parsed = String(temp.self);
				const token = await modules.create_jwt(parsed, '1h');
				
				await modules.set_cookie(response, 'token', token, true, true, 'strict');
				response.writeHead(302, {
					'Location': '/'
				});
				response.end();
				return null;
			}
		}
	});
	return null;
}

module.exports = {
	google_input_handler,
	encrypt_google,
	process_login
}