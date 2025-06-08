import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

// Tested: all working//
async function get_users() {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.all(`SELECT * FROM users`);
    } catch (err) {
        console.error(`Error in get_users: ${err}`)
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Tested: all working
async function get_users_value(search_value, value) {
	const valid_values = ['role_id', 'username', 'self']
	if (!valid_values.includes(search_value))
		return null;
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.get(`
            SELECT * FROM users
            WHERE ${search_value} = '${value}'`);
    } catch (err) {
        console.error(`Error in get_users_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Not tested: But working propperly so far
async function create_users_value(role_id, username, self) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const check = await db.get(`
            SELECT * FROM settings
            WHERE self = ?`, [self]);
        if (!check)
            return -1;
		const check_username = await db.get(`
			SELECT * FROM users
			WHERE username = ?`, [username])
		if (check_username)
			return -2;
        const check_self = await db.get(`
            SELECT * FROM users
            WHERE self = ?`, [self])
        if (check_self)
            return -3;
        var row = await db.run(`
            INSERT INTO users (role_id, username, self)
            VALUES (?, ?, ?)`, [role_id, username, self]);
    } catch (err) {
        console.error(`Error in create_users_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// tested: all working
async function update_users_value(search_value, value, self) {
    const valid_values = ['id', 'role_id', 'username', 'status', 'self'];
    if (!valid_values.includes(search_value))
        return null;
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });
 
    try {
        const check = await db.get(`
            SELECT * FROM settings
            WHERE self = '${self}'
        `);
        if (!check)
            return null;
        const exists = await db.get(`
            SELECT * FROM users
            WHERE username = ?`, [value]);
        if (exists)
            return -1
        var row = await db.run(`
            UPDATE users
            SET ${search_value} = '${value}'
            WHERE self = '${self}'`);
        return row;
    } catch (err) {
        console.error(`Error in update_settings_value: ${err}`);
        return null;
    } finally {
        await db.close();
    }
}

// Tested: all working
async function delete_users_value(self) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const check = await db.get(`
            SELECT * FROM settings
            WHERE self = '${self}'`);
        if (!check)
            return null;
        var row = await db.run(`
            DELETE FROM users
            WHERE users.self = '${self}'`);
    } catch (err) {
        console.error(`Error in delete_users_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

export {
    get_users,
    get_users_value,
    create_users_value,
    update_users_value,
    delete_users_value
}