import { promises as fs } from 'fs';
import * as translator from './translate.js';
import * as modules from './modules.js'

function send(response, content, data, code) {
    response.writeHead(code, {'Content-Type': content});
    response.write(data);
    response.end();
}

async function send_html(filename, request, response, status, func) {
    var data = await fs.readFile(`./templates/${filename}`, 'utf-8');
    if (!data)
        return false;
    if (func && typeof func === 'function') {
        const temp = await func(data);
        if (!temp || temp === undefined || temp == false)
            return false;
        data = temp;
    }
    if (request != null) {
        var [keys, values] = modules.get_cookies(request.headers.cookie);
        const lang_check = keys?.find((key) => key === 'lang');
        if (!lang_check || lang_check === undefined || lang_check == false)
            return false;
        console.log(lang_check);
        const langIndex = keys.indexOf('lang');
        console.log(langIndex);
        const lang = values[langIndex];
        console.log(lang);
        try {
            var decoded_lang = modules.get_jwt(lang);
        } catch (err) {
            return false;
        }
        console.log(decoded_lang);
        if (decoded_lang.userid !== 'en') {
            console.log(decoded_lang.userid)
            data = await translator.cycle_translations(data, decoded_lang.userid);
        }
    }
    send(response, 'text/html', data, status);
    return true;
}

async function send_error_page(filename, request, response, status, func) {
    var data = await fs.readFile(`./error_pages/${filename}`, 'utf-8');
    if (!data)
        return false;
    if (func && typeof func === 'function') {
        const temp = await func(data);
        if (!temp || temp === undefined || temp == false)
            return false;
        data = temp;
    }
    var [keys, values] = modules.get_cookies(request.headers.cookie);
    const lang_check = keys?.find((key) => key === 'lang');
    if (!lang_check || lang_check === undefined || lang_check == false)
        return false;
    const langIndex = keys.indexOf('lang');
    const lang = values[langIndex];
    try {
        var decoded_lang = modules.get_jwt(lang);
    } catch (err) {
        return false;
    }
    if (decoded_lang.userid !== 'en') {
        data = await translator.cycle_translations(data, decoded_lang.userid);
    }
    send(response, 'text/html', data, status);
    return true;
}

function redirect(response, location, code) {
    if (!response || !location || !code || response === undefined || location === undefined || code === undefined)
        return false;
    response.writeHead(code, {
        'Location': location,
    });
    response.end();
    return true;
}

export {
    send,
    send_html,
    send_error_page,
    redirect
}