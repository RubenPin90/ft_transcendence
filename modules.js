import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

dotenv.config();

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

async function create_encrypted_password(password) {
    const hashed_password = await bcrypt.hash(password, 10);
    return hashed_password;
}

async function check_encrypted_password(password, hashed) {
    const compared_password = bcrypt.compare(password, hashed);
    return compared_password;
}

async function send_email(receiver, subject, text) {
	console.log(receiver);
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

	transporter.sendMail(mailOptions, (err) => {
		if (err)
			console.log(`Error in sending: ${err}`);
		else
			console.log("Succesfully sent");
	});
}

export {
	get_cookies,
	set_cookie,
	create_jwt,
	get_jwt,
	create_encrypted_password,
	check_encrypted_password,
	send_email
}