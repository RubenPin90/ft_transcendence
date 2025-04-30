import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import translate from 'google-translate-api'

dotenv.config();

function get_cookies(request) {
	if (!request || request === undefined)
		return [null, null];
	const values = request.split('; ');
	if (!values || values === undefined)
		return [null, null]
	let key = [];
	let value = [];
	values.forEach(element => {
		const [i_key, i_value] = element.split('=');
		key.push(i_key);
		value.push(i_value);
	});
	return [key, value];
}

function create_jwt(data, expire) {
	var token;
	try {
		token = jwt.sign({ userid: data }, process.env.JWT_KEY, {expiresIn: expire});
	} catch (err) {
		return -1;
	}
	return token;
}

function get_jwt(token) {
	var token;
	try {
		token = jwt.verify(token, process.env.JWT_KEY);
	} catch (err) {
		return -1;
	}
	return token;
}

function set_cookie(response, key, value, HttpOnly, Secure, SameSite) {
	response.setHeader('Set-Cookie', `${key}=${value}`, { httpOnly: HttpOnly, secure: Secure, sameSite: SameSite });
}

async function create_encrypted_password(password) {
	var hashed_password;
	try {
		hashed_password = await bcrypt.hash(password, 10);
	} catch (err) {
		return -1;
	}
    return hashed_password;
}

async function check_encrypted_password(password, hashed) {
	var compared_password
    try {
		compared_password = await bcrypt.compare(password, hashed);
	} catch (err) {
		return -1;
	}
    return compared_password;
}

async function send_email(receiver, subject, text) {
	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASSWORD
		}
	});

	const mailOptions = {
		from: process.env.SMTP_USER,
		to: receiver,
		subject: subject,
		text: text
	};

	try {
		await transporter.sendMail(mailOptions);
	} catch (err) {
		return false;
	}
	return true;
}

async function easyfetch(url, method, header, body) {
	if (!url || url === undefined || !method || method === undefined || !header || header === undefined)
		return -1;
	var raw_data;
	if (!body || body === undefined) {
		raw_data = await fetch(url, {
			method: method,
			headers: header,
		});
	} else {
		raw_data = await fetch(url, {
			method: method,
			headers: header,
			body: body
		});
	}
	if (!raw_data.ok) {
		console.log(`Easyfetch error with url ${url}`);
		return -2;
	}
	var token_data;
	try {
		token_data = await raw_data.json();
	} catch (err) {
		return -3;
	}
	return token_data;
}

async function translator(text, lang) {
	const response = await fetch("https://libretranslate.com/translate", {
		method: "POST",
		body: JSON.stringify({
			q: "Hallo Welt",
			source: "de",
			target: "en"
		}),
		headers: { "Content-Type": "application/json" }
	});
	console.log(await response.json());
	
	if (!response.ok)
		return -1;

	const data = await response.json();
	if (!data || data === undefined)
		return -2;
	console.log(data);
	return data;
}

export {
	get_cookies,
	set_cookie,
	create_jwt,
	get_jwt,
	create_encrypted_password,
	check_encrypted_password,
	send_email,
	easyfetch,
	translator
}