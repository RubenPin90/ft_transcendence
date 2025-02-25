require('dotenv').config()
const fs = require('fs').promises;
const modules = require('./modules');
const utils = require('./utils');
const db = require('./database/db_user_functions');
const jwt = require('jsonwebtoken');

async function home(request, response) {
	var [keys, values] = await modules.get_cookies(request.headers.cookie);
	if (request.url === '/' && !keys?.includes("token")) {
		response.writeHead(302, {
			'Location': '/login'
		});
		response.end();
		return null;
	}
	if (request.url !== '/') {
		const data = await utils.encrypt_google(request, response);
		const token = await modules.create_jwt(data, '1h');

		await modules.set_cookie(response, 'token', token, true, true, 'strict');
		response.writeHead(302, {
			'Location': '/'
		});
		response.end();
		return null;
	}
	var html_data = await fs.readFile('./templates/home.html', 'utf-8');
	const tokenIndex = keys?.find((key) => key === 'token');
	const token = values?.at(tokenIndex);
	try {
		var decoded = await modules.get_jwt(token);
	} catch (err) {
		console.log(err);
		return "empty";
	}
	const replace_data = await db.get_username(decoded.userid);
	if (!replace_data)
		return "empty";
	html_data = html_data.replace("{{user_id}}", replace_data.username);
	return html_data;
}


async function login(request, response) {
	const check_login = await modules.check_login(request, response);
	if (check_login === null || check_login === "empty")
		return check_login;
	let body = '';
	request.on('data', async (chunk) => {
		body += chunk.toString();
	});
	request.on('end', async () => {
		body = body.slice(body.indexOf(":") + 2);
		body = body.slice(0, body.indexOf("\""));
		const email = await db.is_email(body);
		if (!email)
			console.log("Email not found");
		else {
			const temp = await db.get_password(body);
			if (!temp)
				console.log("No password found");
			else {
				console.log("Logged in");
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
	var data = await fs.readFile('./templates/login.html', 'utf-8');
	const link = await utils.google_input_handler();
	data = data.replace("{{google_login}}", link);
	return data;
}

async function register(request, response) {
	const check_login = await modules.check_login(request, response);
	if (check_login === null || check_login === "empty")
		return check_login;
	var data = await fs.readFile('templates/register.html', 'utf-8');
	const link = await utils.google_input_handler();
	data = data.replace("{{google_login}}", link);
	return data;
}

module.exports = {
	home,
	login,
	register
};