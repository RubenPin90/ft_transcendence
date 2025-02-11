const fs = require('fs').promises;
const modules = require('./modules');
const utils = require('./utils');

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
		response.setHeader('Set-Cookie', `token=${data}`);
		response.writeHead(302, {
			'Location': '/'
		});
		response.end();
		return null;
	}
	var html_data = await fs.readFile('./templates/home.html', 'utf-8');
	const tokenIndex = keys?.find((key) => key === 'token');
	const replace_data = values?.at(tokenIndex);
	if (!replace_data)
		return null;
	html_data = html_data.replace("{{user_id}}", replace_data);
	return html_data;
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