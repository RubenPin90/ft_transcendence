import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function get_chatrooms() {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.all(`SELECT * FROM chatrooms`);
    } catch (err) {
        console.error(`Error in get_chatrooms: ${err}`)
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Not tested
async function get_chatrooms_value(search_value, value) {
    const valid_values = ['name', 'self'];
    if (!valid_values.includes(search_value))
        return null;

    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.get(`
            SELECT * FROM chatrooms
            WHERE ${search_value} = ${value}`);
    } catch (err) {
        console.error(`Error in get_chatrooms_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Not tested
async function create_chatrooms_value(name, self) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    })

    try {
        const check = await db.get(`
            SELECT * FROM settings
            WHERE self = '${self}'`);
        if (!check)
            return null;
        const check_self = await db.get(`
            SELECT * FROM chatrooms
            WHERE self = '${self}'`)
        if (check_self)
            return null;
        var row = await db.run(`
            INSERT INTO chatrooms (name, self)
            VALUES (?, ?)`, [name, self]);
    } catch (err) {
        console.error(`Error in create_chatrooms_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Not tested
async function update_chatrooms_value(search_value, value, self) {
    const valid_values = ['name'];
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
        var row = await db.run(`
            UPDATE chatrooms
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

// Tested: all working
async function delete_chatrooms_value(self) {
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
            DELETE FROM chatrooms
            WHERE chatrooms.self = '${self}'`);
    } catch (err) {
        console.error(`Error in delete_chatrooms_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

export {
    get_chatrooms,
    get_chatrooms_value,
    create_chatrooms_value,
    update_chatrooms_value,
    delete_chatrooms_value
}