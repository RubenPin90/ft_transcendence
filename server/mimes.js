import { promises as fs } from 'fs';
import * as send from './responses.js'

async function get_js(filename, response) {
    const modified = filename.slice(1);
    try {
        var data = await fs.readFile(`./scripts/${modified}`, 'utf-8');
        send.send(response, "application/javascript", data, 200);
    } catch (err) {
        return null;
    }
    return data;
}

async function get_ts(filename) {
    return await get_js(filename);
}

export {
    get_js,
    get_ts
}