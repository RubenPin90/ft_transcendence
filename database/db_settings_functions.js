const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Tested: All working
async function get_settings_value(value) {
    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });
    
    try {
        var row = await db.get(`
        SELECT * FROM settings
        WHERE self = ${value}`);
    } catch (err) {
        console.log(`Error in get_settings_value: ${err}`);
    } finally {
        await db.close();
        return row;
    }
}

// Tested: all working
async function get_settings() {
    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.all(`
            SELECT * FROM settings`);
    } catch (err) {
        console.log(`Error in get_settings: ${err}`);
    } finally {
        await db.close();
        return row;
    }
}

// Not tested: But working propperly so far
async function create_settings_value(password, pfp, mfa, email, google, github) {
    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        let check = await db.get(
            `SELECT * FROM settings
            WHERE password = ?
            `, [password]
		);
		if (check)
			return 1;
        check = await db.get(
            `SELECT * FROM settings
            WHERE pfp = ?
            `, [pfp]
        );
        if (check)
            return 2;
        check = await db.get(
            `SELECT * FROM settings
            WHERE mfa = ?
            `, [mfa]
        );
        if (check)
            return 3;
        check = await db.get(
            `SELECT * FROM settings
            WHERE email = ?
            `, [email]
		);
		if (check)
			return 4;
		check = await db.get(
			`SELECT * FROM settings
			WHERE google = ?
			`, [google]
		);
		if (check && google !== 0)
			return 5;
		check = await db.get(
			`SELECT * FROM settings
			WHERE github = ?
			`, [github]
		);
		if (check && github !== 0)
			return 6;
        const self = 47858745;
		check = await db.get(
			`SELECT * FROM settings
			WHERE self = ?
			`, [self]
		);
		if (check && self !== 0)
			return 7;
		var row = await db.run(
			`INSERT INTO settings (password, pfp, mfa, email, google, github, self) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[password, pfp, mfa, email, google, github, self]
		);
		console.log(`New user created with ID: ${result.lastID}`);
    } catch (err) {
        console.log(`Error in create_settings_value: ${err}`);
    } finally {
        await db.close();
        return row;
    }
}

// Tested: all working
async function update_settings_value(search_value, value, self) {
    const valid_values = ['pfp', 'password', 'mfa', 'email', 'google', 'github'];
    if (!valid_values.includes(search_value))
        return null;
    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const check = await db.get(`
            SELECT * FROM settings
            WHERE self = ${self}
        `);
        if (!check)
            return null;
        var row = await db.run(`
            UPDATE settings
            SET ${search_value} = '${value}'
            WHERE self = ${self}`);
    } catch (err) {
        console.log(`Error in update_settings_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function delete_settings_value(self) {
    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const check = await db.get(`
            SELECT * FROM settings
            WHERE self = ${self}`);
        if (!check)
            return null;
        var row = await db.run(`
            DELETE FROM settings
            WHERE mfa.self = ${self}`);
    } catch (err) {
        console.log(`Error in delete_mfa_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

module.exports = {
    get_settings,
    get_settings_value,
    create_settings_value,
    update_settings_value,
    delete_settings_value
}