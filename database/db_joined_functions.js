import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

// In testing: need values to work
async function get_settings_mfa_value(search_value, value) {
    const valid_values = ['id', 'email', 'otc', 'custom', 'self'];
    if (!valid_values.includes(search_value))
        return null;

    const db = await open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const row = await db.get(`
            SELECT 
                settings.id AS settings_id,
                settings.password,
                settings.pfp,
                settings.MFA,
                settings.email AS settings_email,
                settings.google,
                settings.github,
                settings.self AS settings_self,
                mfa.id AS mfa_id,
                mfa.email AS mfa_email,
                mfa.otc,
                mfa.custom,
                mfa.self AS mfa_self
            FROM settings
            LEFT JOIN mfa ON mfa.self = settings.self
            WHERE mfa.${search_value} = ?`, [value]);

        return row;
    } catch (err) {
        console.log(`Error in get_mfa_with_settings: ${err}`);
        return null;
    } finally {
        await db.close();
    }
}

export {
    get_settings_mfa_value
}