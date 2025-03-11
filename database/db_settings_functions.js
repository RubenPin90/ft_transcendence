const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

async function get_settings_value(search_value, value) {
    const valid_values = ['id', 'password', 'mfa', 'email', 'google', 'github', 'self'];
    if (!valid_values.includes(search_value))
        return null;

    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });
    
    try {
        const row = await db.run(`
        SELECT * FROM settings
        WHERE ${search_value} = ?`, [value]);
        return row;
    } catch (err) {
        console.log(`Error in get_settings_value: ${err}`);
    } finally {
        await db.close();
    }
}

async function get_settings_mfa_value(search_value, value) {
    const valid_values = ['id', 'email', 'otc', 'custom', 'self'];
    if (!valid_values.includes(search_value))
        return null;

    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const row = await db.get(`
            SELECT 
                settings.id AS settings_id,
                settings.password,
                settings.2FA,
                settings.email AS settings_email,
                settings.google,
                settings.github,
                settings.self AS settings_self,
                mfa.id AS mfa_id,
                mfa.email AS mfa_email,
                mfa.otc,
                mfa.custom,
                mfa.self AS mfa_self
            FROM mfa
            LEFT JOIN settings ON mfa.self = settings.self
            WHERE mfa.${search_value} = ?`, [value]);

        return row;
    } catch (err) {
        console.log(`Error in get_mfa_with_settings: ${err}`);
    } finally {
        await db.close();
    }
}

module.exports = {
    get_settings_value
}