const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');


async function create_user(email, username, password, pfp, google, github, self) {
	const db = await sqlite.open({
		filename: 'users.sqlite',
		driver: sqlite3.Database
	});

	try {
		let check = await db.get(
			`SELECT * FROM users
			WHERE email = ?
			`, [email]
		);
		if (check)
			return 1;
		check = await db.get(
			`SELECT * FROM users
			WHERE username = ?
			`, [username]
		);
		if (check && username !== '')
			return 2;
		check = await db.get(
			`SELECT * FROM users
			WHERE pfp = ?
			`, [pfp]
		);
		if (check)
			return 3;
		check = await db.get(
			`SELECT * FROM users
			WHERE google = ?
			`, [google]
		);
		if (check && google !== 0)
			return 4;
		check = await db.get(
			`SELECT * FROM users
			WHERE github = ?
			`, [github]
		);
		if (check && github !== 0)
			return 5;
		check = await db.get(
			`SELECT * FROM users
			WHERE self = ?
			`, [self]
		);
		if (check && self !== 0)
			return 6;
		const result = await db.run(
			`INSERT INTO users (username, password, pfp, email, google, github, self) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[username, password, pfp, email, google, github, self]
		);
		console.log(`New user created with ID: ${result.lastID}`);
	} catch (err) {
		console.error('Error at inserting:', err.message);
	} finally {
		await db.close();
		console.log('Db successfully disconected');
	}
	return 0;
}

async function show_user() {
	const db = await sqlite.open({
		filename: 'users.sqlite',
		driver: sqlite3.Database
	});

	try {
		const rows = await db.all('SELECT * FROM users');
		console.log('Users: ', rows);
	} catch (err) {
		console.log('Error fetching:', err.message);
	} finally {
		await db.close();
		console.log("Db successfully disconected");
	}
}

async function get_username(id) {
	const db = await sqlite.open({
		filename: 'users.sqlite',
		driver: sqlite3.Database
	});

	try {
		const row = await db.get(`
            SELECT 
                username,
                CASE 
                    WHEN google = ? THEN 1
                    WHEN github = ? THEN 2
                    WHEN self = ? THEN 3
                    ELSE 0
                END AS source
            FROM users
            WHERE google = ? OR github = ? OR self = ?;
        `, [id, id, id, id, id, id]);

        return row ? { username: row.username, source: row.source } : null;
	} catch (err) {
		console.error('Error at getting:', err.message);
	} finally {
		await db.close();
		console.log('Db successfully disconected');
	}
}

async function get_password(email) {
	const db = await sqlite.open({
		filename: 'users.sqlite',
		driver: sqlite3.Database
	});

	try {
		const row = await db.get(`
            SELECT * FROM users
			WHERE email = ?`
			,[email]);
        return row;
	} catch (err) {
		console.error('Error at getting:', err.message);
	} finally {
		await db.close();
		console.log('Db successfully disconected');
	}
}


async function is_email(email) {
	const db = await sqlite.open({
		filename: 'users.sqlite',
		driver: sqlite3.Database
	});

	try {
		const row = await db.get(`
            SELECT * FROM users
			WHERE email = ?`
			,[email]);
		return row;
	} catch (err) {
		console.error('Error at getting:', err.message);
	} finally {
		await db.close();
		console.log('Db successfully disconected');
	}
}


async function get_id_email(email) {
	const db = await sqlite.open({
		filename: 'users.sqlite',
		driver: sqlite3.Database
	});

	try {
		const row = await db.get(`
            SELECT * FROM users
			WHERE self = ?`
			,[email]);
		return row;
	} catch (err) {
		console.error('Error at getting:', err.message);
	} finally {
		await db.close();
		console.log('Db successfully disconected');
	}
}

module.exports = {
	create_user,
	show_user,
	get_username,
	get_password,
	is_email,
	get_id_email,
}