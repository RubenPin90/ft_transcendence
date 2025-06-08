import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import * as modules from '../backend/modules.js';
import { promises as fs } from 'fs';

const max_loop_size = 1000000000;

// Tested: All working
async function get_settings_value(search_value, value) {
    const valid_values = ['password', 'pfp', 'MFA', 'email', 'lang', 'google', 'github', 'self'];
    if (!valid_values.includes(search_value))
        return -1;

    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.get(`
        SELECT * FROM settings
        WHERE ${search_value} = ?`, [value]);
    } catch (err) {
        console.error(`Error in get_settings_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Tested: all working
async function get_settings() {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.all(`
        SELECT * FROM settings`);
    } catch (err) {
        console.error(`Error in get_settings: ${err}`);
    } finally {
        await db.close();
        return row;
    }
}

// Not tested: But working propperly so far
async function create_settings_value(password, pfp, mfa, email, lang, google, github) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });
    
    try {
        let check_github;
        let check_google;
        if (google != '') {
            check_google = await db.get(
                `SELECT * FROM settings
                WHERE google = ?
                `, [google]
            );
            if (check_google)
                return -1;
        }
        if (github != '') {
            check_github = await db.get(
                `SELECT * FROM settings
                WHERE github = ?
                `, [github]
            );
            if (check_github)
                return -2;
        }
        var self;
        if (google != '')
            self = google;
        else if (github != '')
            self = github;
        else {
            var check;
            var random_self = Math.floor(Math.random() * 1000000000);
            var it = 0
            while (it < 2000000000) {
                check = await db.get(`
                    SELECT * from settings
                    WHERE self = ${random_self}`);
                    if (!check)
                        break;
                    it++;
                    random_self = Math.floor(Math.random() * 1000000000);
            }
            if (it == max_loop_size) {
                console.error(`Error in create_settings_value: ${err}`);
                return null;
            }
            self = random_self;
        }
        var check_email = await db.get(
            `SELECT * FROM settings
            WHERE email = ?
            `, [email]
        );
        if (check_email) {
            const id = await get_settings_value('email', email);
            const user_id = id.self;
            if (id.github == '0') {
                await update_settings_value('github', github, user_id);
            }
            if (id.google == '0') {
            }
            const ret = await get_settings_value('email', email);
            self = ret.self;
            return {"return": row, "self": ret.self};
        }
        var row = await db.run(
			`INSERT INTO settings (password, pfp, mfa, email, lang, google, github, self) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[password, pfp, mfa, email, lang, google, github, self]
		);
        return {"return": row, "self": self};
    } catch (err) {
        console.error(`Error in create_settings_value: ${err}`);
        return null;
    } finally {
        await db.close();
    }
}

// Tested: all working
async function update_settings_value(search_value, value, self) {
    const valid_values = ['pfp', 'password', 'mfa', 'email', 'lang', 'google', 'github'];
    if (!valid_values.includes(search_value))
        return null;
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    if (search_value === 'password'){
        value = await modules.create_encrypted_password(value);
    }
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
        console.error(`Error in update_settings_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function delete_settings_value(self) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const check = await db.get(`
        SELECT * FROM settings
        WHERE self = ?`, [self]);
        if (!check)
            return null;
        var row = await db.run(`
        DELETE FROM settings
        WHERE settings.self = '${self}'`);
    } catch (err) {
        console.error(`Error in delete_settings_value: ${err}`);
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