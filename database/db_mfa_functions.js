import * as sqlite from 'sqlite';
import * as sqlite3 from 'sqlite3';

async function get_mfa() {
    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.all(`SELECT * FROM mfa`);
    } catch (err) {
        console.log(`Error in get_mfa: ${err}`)
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Tested: all working
async function get_mfa_value(search_value, value) {
    const valid_values = ['email', 'otc', 'custom', 'self'];
    if (!valid_values.includes(search_value))
        return null;

    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.get(`
            SELECT * FROM mfa
            WHERE ${search_value} = ?`, [value]);
    } catch (err) {
        console.log(`Error in get_mfa_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Not tested: But working propperly so far
async function create_mfa_value(mfa_email, otc, custom, self) {
    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    })

    try {
        const check = await db.get(`
            SELECT * FROM settings
            WHERE self = '${self}'`);
        if (!check)
            return null;
        const check_self = await db.get(`
            SELECT * FROM mfa
            WHERE self = '${self}'`)
        if (check_self)
            return null;
        var row = await db.run(`
            INSERT INTO mfa (email, otc, custom, self)
            VALUES (?, ?, ?, ?)`, [mfa_email, otc, custom, self]);
    } catch (err) {
        console.log(`Error in create_mfa_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function update_mfa_value(search_value, value, self) {
    const valid_values = ['email', 'otc', 'custom'];
    if (!valid_values.includes(search_value))
        return null;
    const db = await sqlite.open({
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
            UPDATE mfa
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

// Tested: all working
async function delete_mfa_value(self) {
    const db = await sqlite.open({
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
            DELETE FROM mfa
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
    get_mfa,
    get_mfa_value,
    create_mfa_value,
    update_mfa_value,
    delete_mfa_value
}