import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const max_loop_size = 1000000000;

// Tested: All working
async function get_settings_value(search_value, value) {
    const valid_values = ['password', 'pfp', 'MFA', 'email', 'google', 'github', 'self'];
    if (!valid_values.includes(search_value))
        return -1;

    const db = await open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });
    
    try {
        var row = await db.get(`
        SELECT * FROM settings
        WHERE ${search_value} = ?`, [value]);
    } catch (err) {
        console.log(`Error in get_settings_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Tested: all working
async function get_settings() {
    const db = await open({
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
    const db = await open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        let check = await db.get(
            `SELECT * FROM settings
			WHERE google = ?
			`, [google]
		);
		if (check && google !== 0)
			return -1;
        check = await db.get(
            `SELECT * FROM settings
			WHERE github = ?
			`, [github]
		);
		if (check && github !== 0)
			return -2;
        var self;
        if (google !== 0)
            self = google;
        else if (github !== 0)
            self = github;
        else {
            console.log(max_loop_size);
            var random_self = Math.floor(Math.random() * 1000000000);
            var it = 0
            while (it < max_loop_size) {
                check = await db.get(`
                    SELECT * from settings
                    WHERE self = ${random_self}`);
                if (!check)
                    break;
                it++;
                random_self = Math.floor(Math.random() * 1000000000);
            }
            if (it == max_loop_size) {
                console.log(`Error in create_settings_value: ${err}`);
                return null;
            }
            self = random_self;
        }
        var row = await db.run(
			`INSERT INTO settings (password, pfp, mfa, email, google, github, self) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[password, pfp, mfa, email, google, github, self]
		);
		console.log(`New user created with ID: ${row.lastID}`);
    } catch (err) {
        console.log(`Error in create_settings_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return {"return": row, "self": self};
    }
}

// Tested: all working
async function update_settings_value(search_value, value, self) {
    const valid_values = ['pfp', 'password', 'mfa', 'email', 'google', 'github'];
    if (!valid_values.includes(search_value))
        return null;
    const db = await open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const check = await db.get(`
            SELECT * FROM settings
            WHERE self = '${self}'
        `);
        if (!check)
            return null;
        var row = await db.run(`
        UPDATE settings
        SET ${search_value} = '${value}'
        WHERE self = '${self}'`);
    } catch (err) {
        console.log(`Error in update_settings_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function delete_settings_value(self) {
    const db = await open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const check = await db.get(`
        SELECT * FROM settings
        WHERE self = '${self}'`);
        if (!check)
            return null;
        var row = await db.run(`
        DELETE FROM settings
        WHERE mfa.self = '${self}'`);
    } catch (err) {
        console.log(`Error in delete_mfa_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

export {
    get_settings,
    get_settings_value,
    create_settings_value,
    update_settings_value,
    delete_settings_value
}