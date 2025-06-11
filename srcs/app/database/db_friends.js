import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

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

async function show_accepted_friends(userid){
	const db = await open({
		filename: './database/db.sqlite',
		driver: sqlite3.Database
	});
	if (!db){
		return;
	}
	var html = '';
	try {
		var rows = await db.all(`
			SELECT * FROM friends
			WHERE (user1 = ? OR user2 = ?)`, [userid, userid]);
		for (var single of rows){
			var correctId;
			if (single.user1 == userid){
				correctId = single.user2;
			}else{
				correctId = single.user1;
			}
			const sender_settings = await db.get(`
				SELECT * FROM settings WHERE self = ?
				`, [correctId]);
			const sender_user = await db.get(`
				SELECT * FROM users WHERE self = ?
				`, [correctId]);
			const name = sender_user.username;
			if (sender_user.status === 'online'){
				html += `
				<div class="relative flex-shrink-0">
					<img class="w-24 h-24 rounded-full border-4 border-green-600" src="${sender_settings.pfp}">
					<span class="absolute text-center w-full">${name}</span><br>
				</div> 
				`;
			} else{
				html += `
				<div class="relative flex-shrink-0">
					<img class="w-24 h-24 rounded-full border-4 grayscale border-green-600" src="${sender_settings.pfp}">
					<span class="absolute text-center w-full">${name}</span><br>
				</div> 
				`;
			}
		}
	} catch (err) {
		console.error(`Error in show_accepted_friends: ${err}`);
		return null;
	} finally {
		await db.close();
		if (html == ''){
			return `<span>No friends currenlty :'( you lonely MF</span>`;
		}
		return html;
	}
}

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

export {
    get_friends,
    create_friends_value,
    delete_friends_value,
	show_accepted_friends
}