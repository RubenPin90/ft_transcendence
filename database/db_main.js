import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function create_db() {
    const db = await open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        // Fremdschlüssel aktivieren
        await db.run(`PRAGMA foreign_keys = ON;`);
        console.log("Fremdschlüssel aktiviert!");

        // Tabellen in richtiger Reihenfolge erstellen
        await db.run(`
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            mute INTEGER,
            ban INTEGER,
            change_score INTEGER
        );`);

        await db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            password TEXT,
            pfp text,
            MFA INTEGER,
            email TEXT,
            lang TEXT,
            google TEXT,
            github TEXT,
            self TEXT UNIQUE NOT NULL
        );`);

        await db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_id INTEGER,
            username TEXT,
            status INTEGER,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`);

        await db.run(`
        CREATE TABLE IF NOT EXISTS mfa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email INTEGER,
            otc TEXT,
            custom TEXT,
            prefered INTEGER,
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
            userid INTEGER,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (room_id) REFERENCES chatrooms(id) ON DELETE CASCADE,
            FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
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
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            points INTEGER,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`);





        await db.run(`
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, friend_id)
        );`);



        console.log("Alle Tabellen erfolgreich erstellt oder existieren bereits.");
    } catch (err) {
        console.log(`Error creating db: ${err}`);
        return -1;
    } finally {
        console.log('Database setup abgeschlossen');
        db.close();
        return 0;
    }
}


async function show_full_db() {
    const db = await open({
        filename: "db.sqlite",
        driver: sqlite3.Database
    });

    try {
        const row = await db.all(`
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
            mfa.prefered,
            mfa.self AS mfa_self,
            users.id AS users_id,
            users.role_id,
            users.username,
            users.self AS users_self,
            roles.id roles_id,
            roles.name,
            roles.mute,
            roles.ban,
            roles.change_score,
            scoreboard.id AS scoreboard_id,
            scoreboard.max,
            scoreboard.rank,
            scoreboard.self AS scoreboard_self,
            chatrooms.id AS chatrooms_id,
            chatrooms.name,
            chatrooms.self AS chatrooms_self,
            messages.id AS messages_id,
            messages.room_id,
            messages.userid,
            messages.message,
            messages.timestamp,
            scores.id AS scores_id,
            scores.points,
            scores.self AS scores_self
        FROM settings
        LEFT JOIN mfa ON mfa.self = settings.self
        LEFT JOIN users ON users.self = settings.self
        LEFT JOIN roles ON roles.id = users.role_id
        LEFT JOIN scoreboard ON scoreboard.self = settings.self
        LEFT JOIN chatrooms ON chatrooms.self = settings.self
        LEFT JOIN messages ON messages.userid = users.id
        LEFT JOIN scores ON scores.self = settings.self
        `);
        return row;
    } catch (err) {
        console.log(`Error in show_full_db: ${err}`);
        return null;
    } finally {
        await db.close();
    }
}

export {
    create_db,
    show_full_db
}