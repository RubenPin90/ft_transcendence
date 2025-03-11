const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

async function create_db() {
    const db = await sqlite.open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        await db.run(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            password TEXT,
            2FA INTEGER,
            email INTEGER,
            google INTEGER,
            github INTEGER,
            self TEXT UNIQUE NOT NULL
        );`);
        await db.run(`
        CREATE TABLE IF NOT EXISTS mfa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            otc INTEGER,
            custom INTEGER,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`);
        await db.run(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_id INTEGER,
            username TEXT,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`);
        await db.run(`
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            mute INTEGER,
            ban INTEGER,
            change_score INTEGER
        );`);
        await db.run(`
        CREATE TABLE IF NOT EXISTS scoreboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            max INTEGER,
            rank INTEGER,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`);
        await db.run(`
        CREATE TABLE IF NOT EXISTS chatrooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`);
        await db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER,
            user_id INTEGER,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (room_id) REFERENCES chatrooms(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );`);
        await db.run(`
        CREATE TABLE IF NOT EXISTS globalchat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`)
        await db.run(`
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            points INTEGER,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`)
    } catch (err) {
        console.log(`Error creating db: ${err}`);
        return -1;
    } finally {
        db.close();
        return 0;
    }
}

module.exports = {
    create_db
}