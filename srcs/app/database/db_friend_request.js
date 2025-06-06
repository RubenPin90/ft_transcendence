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
    } catch (err) {
        console.error(`Error in get_friend_request: ${err}`)
        return null;
    } finally {
        await db.close();
        return row;
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
    } catch (err) {
        console.error(`Error in get_friend_request_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

// Not tested: But working propperly so far
async function create_friend_request_value(sender_id, receiver_id) {
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        console.log("wwwwww");
        const sender = await db.get(`
            SELECT * FROM settings
            WHERE self = ?`, [sender_id]);
        if (!sender)
            return -1;
        console.log("wwwwww");
        const receiver = await db.get(`
            SELECT * FROM settings
            WHERE self = ?`, [receiver_id]);
        if (!receiver)
            return -2;
        console.log("wwwwww");
		const existing_request = await db.get(
            `SELECT * FROM friend_request
            WHERE sender_id = ? AND receiver_id = ?`,
            [sender.self, receiver.self]
        );
        if (existing_request)
            return -3;
        console.log("wwwwww");
        var row = await db.run(`
            INSERT INTO friend_request (sender_id, receiver_id)
            VALUES (?, ?)`, [sender.self, receiver.self]);
    } catch (err) {
        console.error(`Error in create_friend_request_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
    }
}

async function update_friend_request_value(id, status) {
    // const valid_values = ['id', 'status', 'sender_id', 'receiver_id'];
    // if (!valid_values.includes(status))
    //     return null;
    const db = await open({
        filename: './database/db.sqlite',
        driver: sqlite3.Database
    });

    try {
        var row = await db.run(`
            UPDATE friend_request
            SET status = ?
            WHERE id = ?`, [status, id]);
    } catch (err) {
        console.error(`Error in update_friend_request_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
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
    } catch (err) {
        console.error(`Error in delete_friend_request_value: ${err}`);
        return null;
    } finally {
        await db.close();
        return row;
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
            WHERE receiver_id = ? AND status = 'pending'
            `, [userid]);
            for (var single of rows){
                const sender_settings = await db.get(`
                    SELECT * FROM settings WHERE self = ?
                    `, [single.sender_id]);
                const sender_user = await db.get(`
                    SELECT * FROM users WHERE id = ?
                    `, [sender_settings.id]);
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
                    // <div class="absolute right-3 top-1/2 -translate-y-1/2 flex space-x-2 text-gray-600">
                    //     <button onclick="block_friend('${single.id}')">
                    //         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    //             stroke-width="1.5" stroke="currentColor" class="size-6 cursor-pointer text-red-700">
                    //             <path stroke-linecap="round" stroke-linejoin="round"
                    //                 d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    //         </svg>
                    //     </button>
                    // </div>

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
            SELECT * FROM friend_request
            WHERE (receiver_id = ? OR sender_id = ?) AND status = 'accepted'
            `, [userid, userid]);
        for (var single of rows){
            var correctId;
            if (single.receiver_id === userid){
                correctId = single.sender_id;
            }else{
                correctId = single.receiver_id;
            }
            console.log("correctID::", correctId);
            const sender_settings = await db.get(`
                SELECT * FROM settings WHERE self = ?
                `, [correctId]);
            const sender_user = await db.get(`
                SELECT * FROM users WHERE id = ?
                `, [sender_settings.id]);
            const name = sender_user.username || 'unknown';
            if (sender_user.status === 1){
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

export {
    get_friend_request,
    get_friend_request_value,
    create_friend_request_value,
    update_friend_request_value,
    delete_friend_request_value,
    show_pending_requests,
    show_accepted_friends
}