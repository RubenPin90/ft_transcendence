const fs = require('fs').promises;

async function get_js(filename) {
    const modified = filename.slice(1);
    try {
        var data = await fs.readFile(`./scripts/${modified}`, 'utf-8');
    } catch (err) {
        return null;
    }
    return data;
}

async function get_ts(filename) {
    return await get_js(filename);
}

module.exports = {
    get_js,
    get_ts
}