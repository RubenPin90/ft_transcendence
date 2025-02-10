const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

async function create_user_db() {
	const db = await sqlite.open({
		filename: 'users.sqlite',
		driver: sqlite3.Database
	});
	
	try {
		await db.run(`
		  CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT,
			password TEXT,
			pfp TEXT,
			email TEXT UNIQUE,
			google INTEGER,
			github INTEGER
		  )
		`);
		console.log('Table "users" successfully created.');
	} catch (err) {
		console.error('Error creating table:', err.message);
	} finally {
		await db.close();
		console.log('DB disconnected successfully.');
	}
}

async function create_user(email, username, password, pfp, google, github) {
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
		if (check)
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
		if (check)
			return 4;
		check = await db.get(
			`SELECT * FROM users
			WHERE github = ?
			`, [github]
		);
		if (check)
			return 5;
		const result = await db.run(
			`INSERT INTO users (username, password, pfp, email, google, github) VALUES (?, ?, ?, ?, ?, ?)`,
			[username, password, pfp, email, google, github]
		);
		console.log(`Neuer Datensatz mit ID: ${result.lastID}`);
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

module.exports = {
	create_user_db,
	create_user,
	show_user
}