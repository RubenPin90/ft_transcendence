const modules = require('./modules');
const utils = require('./utils');
const send = require('./responses');
const db = require('./database/db_user_functions');


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

module.exports = {
    login,
    register,
    home
}