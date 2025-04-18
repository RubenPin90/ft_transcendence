import * as views from './views.js';
import * as mimes from './mimes.js';
import * as send from './responses.js';
import path from 'path';
import fs from 'fs/promises';

async function url_pattern(request, response) {
    // console.log(request.url);
    // console.log(response.url);
    switch (true) {
        case request.url === '/':
            return await views.home(request, response);
        case request.url.includes('?code='):
            return await views.home(request, response);
        case request.url === '/login':
            return await views.login(request, response);
        case request.url === '/register':
            return await views.register(request, response);
        case request.url === '/settings':
            return await views.settings(request, response);
        case request.url.includes('/settings?'):
            return await views.settings_set_prefered_mfa(request, response);
        case request.url === '/verify_email':
            return await views.verify_email(request, response);
        case request.url === '/verify_2fa':
            return await views.verify_2fa(request, response);
        case request.url === '/verify_custom':
            return await views.verify_custom(request, response);
        case request.url.includes(".js"):
            return await mimes.get_js(request.url, response);
        case request.url.includes(".css"):
            return await serveStaticFile(request.url, response, 'text/css');
        default:
            return await send.send_error_page("404.html", response, 404);
    }
}

/**
 * Serve static files like CSS, JavaScript, etc.
 * @param {string} url - The requested URL.
 * @param {object} response - The HTTP response object.
 * @param {string} contentType - The MIME type of the file.
 */
async function serveStaticFile(url, response, contentType) {
    try {
        const filePath = path.join(process.cwd(), url); // Resolve the file path
        const fileContent = await fs.readFile(filePath, 'utf8'); // Read the file
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(fileContent, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error serving static file: ${url}`, error);
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('404 Not Found');
        return false;
    }
}

export {
	url_pattern
}