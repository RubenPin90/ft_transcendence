import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function create_db() {
    const db = await open({
        filename: 'db.sqlite',
        driver: sqlite3.Database
    });

    try {
        await db.run(`PRAGMA foreign_keys = ON;`);

        await db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            password TEXT,
            pfp TEXT,
            MFA INTEGER,
            email TEXT,
            lang TEXT,
            google TEXT,
            github TEXT,
            self TEXT UNIQUE NOT NULL
        );`);

        // USERS
        await db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_id INTEGER,
            username TEXT,
            status TEXT DEFAULT online,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`);

        // MFA
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

        // SCOREBOARD
        await db.run(`
        CREATE TABLE IF NOT EXISTS scoreboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            max INTEGER,
            rank INTEGER,
            self TEXT UNIQUE NOT NULL,
            FOREIGN KEY (self) REFERENCES settings(self) ON DELETE CASCADE
        );`);

        // match
        await db.run(`
            CREATE TABLE IF NOT EXISTS match (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                points        TEXT NOT NULL,
                player1       TEXT NOT NULL,
                player2       TEXT NOT NULL,
                winner        TEXT,                             -- NULL until the game ends
                date          DATETIME DEFAULT CURRENT_TIMESTAMP,
                match_id      TEXT UNIQUE NOT NULL,             -- uuid for the room
                tournament_id TEXT,                             -- NULL → “normal” game
                FOREIGN KEY (player1)      REFERENCES users(self)        ON DELETE CASCADE,
                FOREIGN KEY (player2)      REFERENCES users(self)        ON DELETE CASCADE,
                FOREIGN KEY (winner)       REFERENCES users(self)        ON DELETE SET NULL,
                FOREIGN KEY (tournament_id)REFERENCES tournaments(tournament_id) ON DELETE CASCADE
            );`);

        // tournaments
        await db.run(`
        CREATE TABLE IF NOT EXISTS tournaments (
            tournament_id TEXT PRIMARY KEY,          -- uuid from createTournament
            host_id       TEXT NOT NULL,             -- P1 / creator
            winner_id     TEXT,                      -- NULL until bracket ends
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (host_id)  REFERENCES users(self) ON DELETE CASCADE,
            FOREIGN KEY (winner_id)REFERENCES users(self) ON DELETE SET NULL
        );`);
            


        //FRIEND_REQUEST
        await db.run(`
        CREATE TABLE friend_request (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            FOREIGN KEY (sender_id) REFERENCES settings(self) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES settings(self) ON DELETE CASCADE,
            UNIQUE (sender_id, receiver_id)
        );`);

        //FRIENDS
        await db.run(`
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1 TEXT NOT NULL,
            user2 TEXT NOT NULL,
            FOREIGN KEY (user1) REFERENCES settings(self) ON DELETE CASCADE,
            FOREIGN KEY (user2) REFERENCES settings(self) ON DELETE CASCADE,
            UNIQUE (user1, user2)
        );`);


    } catch (err) {
        console.error(`Error creating db: ${err}`);
        return -1;
    } finally {
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
        console.error(`Error in show_full_db: ${err}`);
        return null;
    } finally {
        await db.close();
    }
}

export {
    create_db,
    show_full_db
}