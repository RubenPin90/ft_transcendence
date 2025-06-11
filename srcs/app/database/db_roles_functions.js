import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function get_roles() {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.all(`SELECT * FROM roles`);
    } catch (err) {
        console.error(`Error in get_roles: ${err}`)
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function get_roles_value(search_value, value) {
    const valid_values = ['name', 'mute', 'ban', 'change_score'];
    if (!valid_values.includes(search_value))
        return null;
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.get(`
            SELECT * FROM roles
            WHERE ${search_value} = ${value}`);
    } catch (err) {
        console.error(`Error in get_roles_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function create_roles_value(name, mute, ban, change_score) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    })

    try {
        var row = await db.run(`
            INSERT INTO roles (name, mute, ban, change_score)
            VALUES (?, ?, ?, ?)`, [name, mute, ban, change_score]);
    } catch (err) {
        console.error(`Error in create_roles_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function update_roles_value(search_value, value, id) {
    const valid_values = ['id', 'name', 'mute', 'ban', 'change_score'];
    if (!valid_values.includes(search_value))
        return null;
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.run(`
            UPDATE roles
            SET ${search_value} = '${value}'
            WHERE id = ${id}`);
    } catch (err) {
        console.error(`Error in update_settings_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function delete_roles_value(id) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.run(`
            DELETE FROM roles
            WHERE id = ${id}`);
    } catch (err) {
        console.error(`Error in delete_roles_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

export {
    get_roles,
    get_roles_value,
    create_roles_value,
    update_roles_value,
    delete_roles_value
}