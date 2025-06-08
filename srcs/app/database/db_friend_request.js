import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

// Tested: all working//
async function get_friend_request() {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.all(`SELECT * FROM friend_request`);
        return row;
    } catch (err) {
        console.error(`Error in get_friend_request: ${err}`)
        return null;
    } finally {
        await db.close();
    }
}

// Tested: all working
async function get_friend_request_value(search_value, value) {
	const valid_values = ['status', 'created_at', 'sender_id', 'receiver_id']
	if (!valid_values.includes(search_value))
		return null;
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.get(`
            SELECT * FROM friend_request WHERE ${search_value} = ?`, [value]);
        return row;
    } catch (err) {
        console.error(`Error in get_friend_request_value: ${err}`);
        return null;
    } finally {
        await db.close();
    }
}

// Not tested: But working propperly so far
async function create_friend_request_value(sender_id, receiver_id) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        const sender = await db.get(`
            SELECT * FROM settings
            WHERE self = ?`, [sender_id]);
        if (!sender)
            return -1;
        const receiver = await db.get(`
            SELECT * FROM settings
            WHERE self = ?`, [receiver_id]);
        if (!receiver)
            return -2;
		const existing_request = await db.get(
            `SELECT * FROM friend_request
            WHERE sender_id = ? AND receiver_id = ?`,
            [sender.self, receiver.self]
        );
        if (existing_request)
            return -3;
        var row = await db.run(`
            INSERT INTO friend_request (sender_id, receiver_id)
            VALUES (?, ?)`, [sender.self, receiver.self]);
        return row;
    } catch (err) {
        console.error(`Error in create_friend_request_value: ${err}`);
        return null;
    } finally {
        await db.close();
    }
}

async function update_friend_request_value(id, userid) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        //check if request truly exists for the user
        var request = await db.get(`
            SELECT * FROM friend_request
            WHERE id = ? AND receiver_id = ?
            `, [id, userid]);
        if (!request){
            return -1;
        }
        var alr_friends = await db.get(`
            SELECT * FROM friends
            WHERE (user1 = ? AND user2 = ?) OR (user2 = ? AND user1 = ?)
            `, [request.sender_id, request.receiver_id, request.sender_id, request.receiver_id]);
        if (alr_friends){
            return -2;
        }
        // if it doesnt exists insert sender_id and receiver_id into friends
        var row = await db.run(`
            INSERT INTO friends (user1, user2)
            VALUES (?, ?)`, [request.sender_id, request.receiver_id]);
        // lastly delete the row of friends_request
        var row_req = await db.run(`
            DELETE FROM friend_request
            WHERE id = ?`, [id]);
        
        return row;
    } catch (err) {
        console.error(`Error in update_friend_request_value: ${err}`);
        return null;
    } finally {
        await db.close();
    }
}

// Tested: all working
async function delete_friend_request_value(id) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.run(`
            DELETE FROM friend_request
            WHERE id = ?`, [id]);
            return row;
    } catch (err) {
        console.error(`Error in delete_friend_request_value: ${err}`);
        return null;
    } finally {
        await db.close();
    }
}

async function show_pending_requests(userid){
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    var html = '';
    try {
        var rows = await db.all(`
            SELECT * FROM friend_request
            WHERE receiver_id = ?
            `, [userid]);
            for (var single of rows){
                const sender_settings = await db.get(`
                    SELECT * FROM settings WHERE self = ?
                    `, [single.sender_id]);
                const sender_user = await db.get(`
                    SELECT * FROM users WHERE self = ?
                    `, [sender_settings.self]);
                const name = sender_user.username || 'unknown';
                html += `
                <div id="request-${single.id}" class="flex bg-gray-200 rounded-lg relative">
                    <img src="${sender_settings.pfp}" alt="" class="w-10 h-10">
                    <div class="flex pl-2 items-center text-lg">${name}</div>
                    <div class="absolute right-10 top-1/2 -translate-y-1/2 flex space-x-2 text-gray-600">
                        <button onclick="accept_friend('${single.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                stroke-width="2" stroke="currentColor" class="size-6 cursor-pointer text-green-700 font-bold">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </button>
                    </div>
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 flex space-x-2 text-gray-600">
                        <button onclick="reject_friend('${single.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                stroke-width="1.5" stroke="currentColor" class="size-6 cursor-pointer text-red-700 font-bold">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
                            </svg>
                        </button>
                    </div>
                </div>`;
            }
    } catch (err) {
        console.error(`Error in show_pending_requests: ${err}`);
        return null;
    } finally {
        await db.close();
        return html;
    }
}

export {
    get_friend_request,
    get_friend_request_value,
    create_friend_request_value,
    update_friend_request_value,
    delete_friend_request_value,
    show_pending_requests
}