import { promises as fs } from 'fs';

function send(response, content, data, code) {
    response.raw.writeHead(code, content);
    response.raw.end(data);
}

async function send_html(filename, response, status, func) {
    var data = await fs.readFile(`./backend/templates/${filename}`, 'utf-8');
    if (!data)
        return false;
    if (func && typeof func === 'function') {
        const temp = await func(data);
        if (!temp || temp === undefined || temp == false)
            return false;
        data = temp;
    }
    send(response, 'text/html', data, status);
    return true;
}

async function send_error_page(filename, response, status, func) {
    var data = await fs.readFile(`./error_pages/${filename}`, 'utf-8');
    if (!data)
        return false;
    if (func && typeof func === 'function') {
        const temp = await func(data);
        if (!temp || temp === undefined || temp == false)
            return false;
        data = temp;
    }
    send(response, 'text/html', data, status);
    return true;
}

export {
    send,
    send_html,
    send_error_page
}