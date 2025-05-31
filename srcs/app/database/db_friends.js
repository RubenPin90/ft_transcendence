import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

// Tested: all working//
async function get_friends() {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.all(`SELECT * FROM friends`);
    } catch (err) {
        console.error(`Error in get_friends: ${err}`)
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Tested: all working
async function get_friends_value(search_value, value) {
	const valid_values = ['user1', 'user2', 'since']
	if (!valid_values.includes(search_value))
		return null;
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.get(`
            SELECT * FROM friends
            WHERE ${search_value} = '${value}'`);
    } catch (err) {
        console.error(`Error in get_friends_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function create_friends_value(user1, user2) {
	if (user1 === user2) {
		return -4;
	}

	const db = await open({ filename: './database/db.sqlite', driver: sqlite3.Database });
	try {
		const [check1, check2] = await Promise.all([
			db.get(`SELECT * FROM settings WHERE self = ?`, [user1]),
			db.get(`SELECT * FROM settings WHERE self = ?`, [user2])
		]);
		if (!check1 || !check2) return -1;

		const existing = await db.get(`
			SELECT * FROM friends
			WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)`,
			[user1, user2, user2, user1]
		);
		if (existing) return -2;

		var row = await db.run(`
			INSERT INTO friends (user1, user2) VALUES (?, ?)`,
			[user1, user2]
		);
	} catch (err) {
		console.error(`Error in create_friends_value: ${err}`);
		return null;
	} finally {
		await db.close();
        return row;
	}
}

// // Not tested: But working propperly so far
// async function create_friends_value(user1, user2) {
//     if (user1 === user2){
//         return -4;
//     }

//     const db = await open({
//         filename: './database/db.sqlite',
//         driver: sqlite3.Database
//     });

//     try {
//         const check = await db.get(`
//             SELECT * FROM settings
//             WHERE self = ?`, [self]);
//         if (!check)
//             return -1;
// 		const check_username = await db.get(`
// 			SELECT * FROM friends
// 			WHERE user2 = ?`, [user2])
// 		if (check_username)
// 			return -2;
//         const check_self = await db.get(`
//             SELECT * FROM friends
//             WHERE self = ?`, [self])
//         if (check_self)
//             return -3;
//         var row = await db.run(`
//             INSERT INTO friends (user1, user2)
//             VALUES (?, ?)`, [user1, user2]);
//     } catch (err) {
//         console.error(`Error in create_friends_value: ${err}`);
//         return null;
//     } finally {
//         await db.close();
//         return row;
//     }
// }

async function update_friends_value(search_field, new_value, user1, user2) {
	const valid_fields = ['since'];
	if (!valid_fields.includes(search_field)) return null;

	const db = await open({ filename: './database/db.sqlite', driver: sqlite3.Database });
	try {
		const exists = await db.get(`
			SELECT * FROM friends
			WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)`,
			[user1, user2, user2, user1]
		);
		if (!exists) return null;

		const query = `UPDATE friends SET ${search_field} = ? WHERE id = ?`;
		var row = await db.run(query, [new_value, exists.id]);
	} catch (err) {
		console.error(`Error in update_friends_value: ${err}`);
		return null;
	} finally {
		await db.close();
        return row;
	}
}

// tested: all working
// async function update_friends_value(search_value, value, self) {
//     const valid_values = ['id', 'user1', 'user2', 'since'];
//     if (!valid_values.includes(search_value))
//         return null;
//     const db = await open({
//         filename: './database/db.sqlite',
//         driver: sqlite3.Database
//     });

//     try {
//         const check = await db.get(`
//             SELECT * FROM settings
//             WHERE self = '${self}'
//         `);
//         if (!check)
//             return null;
//         var row = await db.run(`
//             UPDATE friends
//             SET ${search_value} = '${value}'
//             WHERE self = '${self}'`);
//     } catch (err) {
//         console.error(`Error in update_settings_value: ${err}`);
//         return null;
//     } finally {
//         await db.close();
//         return row;
//     }
// }

async function delete_friends_value(user1, user2) {
	const db = await open({ filename: './database/db.sqlite', driver: sqlite3.Database });
	try {
		return await db.run(`
			DELETE FROM friends
			WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)`,
			[user1, user2, user2, user1]
		);
	} catch (err) {
		console.error(`Error in delete_friends_value: ${err}`);
		return null;
	} finally {
		await db.close();
	}
}

// // Tested: all working
// async function delete_friends_value(self) {
//     const db = await open({
//         filename: './database/db.sqlite',
//         driver: sqlite3.Database
//     });

//     try {
//         const check = await db.get(`
//             SELECT * FROM settings
//             WHERE self = '${self}'`);
//         if (!check)
//             return null;
//         var row = await db.run(`
//             DELETE FROM friends
//             WHERE friends.self = '${self}'`);
//     } catch (err) {
//         console.error(`Error in delete_friends_value: ${err}`);
//         return null;
//     } finally {
//         await db.close();
//         return row;
//     }
// }

export {
    get_friends,
    get_friends_value,
    create_friends_value,
    update_friends_value,
    delete_friends_value
}