import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';

dotenv.config();

function get_cookies(request) {
	if (!request || request === undefined)
		return [null, null];
	const cookies = request.cookies;
	if (!cookies || cookies === undefined)
		return [null, null];
	const key = Object.keys(cookies);
	const value = Object.values(cookies);
	return [key, value];
}

async function create_jwt(data, expire) {
	const JWT_KEY = (await fs.readFile(process.env.JWT_SECRET_FILE, 'utf8')).trim();
	var token;
	try {
		token = jwt.sign({ userid: data }, JWT_KEY, {expiresIn: expire});
	} catch (err) {
		return -1;
	}
	return token;
}

async function get_jwt(token) {
	const JWT_KEY = (await fs.readFile(process.env.JWT_SECRET_FILE, 'utf8')).trim();
	var token2;
	try {
		token2 = jwt.verify(token, JWT_KEY);
	} catch (err) {
		return -1;
	}
	return token2;
}

function set_cookie(response, key, value, maxAge) {
	response.setCookie(key, value, {
		path: '/',
		httpOnly: true,
		secure: true,
		maxAge: maxAge
	});
}

function delete_cookie(response, key) {
	response.setCookie(key, '', {
		path: '/',
		httpOnly: true,
		secure: true,
		maxAge: 0
	});
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
	const SMTP_USER = process.env.SMTP_USER;
	const SMTP_PASSWORD = (await fs.readFile(process.env.SMTP_PASSWORD_FILE, 'utf8')).trim();
	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASSWORD
		}
	});

	const mailOptions = {
		from: SMTP_USER,
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
		//console.log(`Easyfetch error with url ${url}`);
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

export {
	get_cookies,
	set_cookie,
	delete_cookie,
	create_jwt,
	get_jwt,
	create_encrypted_password,
	check_encrypted_password,
	send_email,
	easyfetch,
}