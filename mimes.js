const fs = require('fs').promises;
const send = require('./responses');

async function get_js(filename, response) {
    const modified = filename.slice(1);
    try {
        var data = await fs.readFile(`./scripts/${modified}`, 'utf-8');
        send.send(response, 'application/javascript', data, 200);
    } catch (err) {
        return false;
    }
    return true;
}

async function get_ts(filename) {
    return await get_js(filename);
}

module.exports = {
    get_js,
    get_ts
}