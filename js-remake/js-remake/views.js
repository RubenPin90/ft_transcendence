const fs = require('fs').promises;
const modules = require('./modules');
const utils = require('./utils');

async function home(request, response) {
	let [keys, values] = await modules.get_cookies(request.headers.cookie);
	if (request.url === '/' && !keys.includes("token")) {
		return null;
	} else if (request.url !== '/') {
		const data = await utils.encrypt_google(request, response);
		response.setHeader('Set-Cookie', `token=${data}`);
	}
	var data = await fs.readFile('./templates/home.html', 'utf-8');
	data = data.replace("{{user_id}}", values[keys.indexOf("token")]);
	return data;
}

async function login(request, response) {
	var data = await fs.readFile('./templates/login.html', 'utf-8');
	const link = await utils.google_input_handler();
	data = data.replace("{{google_login}}", link);
	return data;
}

module.exports = {
	home,
	login
};