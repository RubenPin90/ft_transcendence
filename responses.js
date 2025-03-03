const utils = require('./utils');
const fs = require('fs').promises;
const db = require('./database/db_user_functions');

function send(response, content, data, code) {
    response.writeHead(code, {'Content-Type': content});
    response.write(data);
    response.end();
}

async function send_html(filename, response, status, func) {
    var data = await fs.readFile(`./templates/${filename}`, 'utf-8');
    if (!data)
        return false;
    if (func && typeof func === 'function') {
        const temp = await func(data);
        if (!temp)
            return false;
        data = temp;
    }
    send(response, 'text/html', data, status);
    return true;
}

async function redirect(response, location, code) {
    response.writeHead(code, {
        'Location': location,
    });
    response.end();
    return true;
}

module.exports = {
    send,
    send_html,
    redirect
}