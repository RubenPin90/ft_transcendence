require('dotenv').config()
const jwt = require('jsonwebtoken');

async function get_cookies(request) {
	const values = request?.split('; ');
	if (!values)
		return [null, null]
	let key = [];
	let value = [];
	values?.forEach(element => {
		const [i_key, i_value] = element.split('=');
		key.push(i_key);
		value.push(i_value);
	});
	return [key, value];
}

async function create_jwt(data, expire) {
	const token = jwt.sign({ userid: data }, process.env.JWT_KEY, {expiresIn: expire});
	return token;
}

async function get_jwt(token) {
	return jwt.verify(token, process.env.JWT_KEY);
}

async function set_cookie(response, key, value, HttpOnly, Secure, SameSite) {
	response.setHeader('Set-Cookie', `${key}=${value}`, { httpOnly: HttpOnly, secure: Secure, sameSite: SameSite });
}

async function check_login(request, response) {
	var [keys, values] = await get_cookies(request.headers.cookie);
	const tokenIndex = keys?.find((key) => key === 'token');
	if (keys && tokenIndex) {
		const token = values?.at(tokenIndex);
		if (token) {
			try {
				var decoded = await get_jwt(token);
				if (decoded) {
					response.writeHead(302, {
						'Location': '/'
					});
					response.end();
					return null;
				}
			} catch (err) {
				console.log(err);
				return "empty";
			}
		}
	}
}

module.exports = {
	get_cookies,
	set_cookie,
	create_jwt,
	get_jwt,
	check_login
}