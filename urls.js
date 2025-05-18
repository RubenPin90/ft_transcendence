import * as views from './views.js';
import * as mimes from './mimes.js';
import * as send from './responses.js';
import path from 'path';
import fs from 'fs/promises';

async function url_pattern(request, response) {
    // console.log(request.url);
    // console.log(response.url);
    switch (true) {
        case request.url.includes(".js"):
            return await mimes.get_js(request.url, response);
        case request.url === '/':
            return await views.home(request, response);
        case request.url.includes(".css"):
            return await serveStaticFile(request.url, response, 'text/css');
        case request.url.includes(".svg"):
            return await serveStaticFile(request.url, response, 'image/svg+xml');
        case request.url.includes(".jpg") || request.url.includes(".jpeg"):
            return await serveStaticFile(request.url, response, 'image/jpeg');
        case request.url.includes('?code='):
            return await views.home(request, response);
        case request.url === '/login':
            return await views.login(request, response);
        case request.url === '/register':
            return await views.register(request, response);
        case request.url.startsWith('/settings'):
            return await views.settings(request, response);
        case request.url === '/verify_email':
            return await views.verify_email(request, response);
        case request.url === '/verify_2fa':
            return await views.verify_2fa(request, response);
        case request.url === '/verify_custom':
            return await views.verify_custom(request, response);
        case request.url === '/profile': //writen by me EC check later
            return await views.profile(request, response);
        case request.url === '/logout': //writen by me EC check later
            return await views.logout(request, response);
        case request.url === '/update_user': //writen by me EC check later
            return await views.update_user(request, response);
        case request.url === '/update_settings': //writen by me EC check later
            return await views.update_settings(request, response);
        case request.url === '/settings/user_settings' || request.url === '/settings/change_user' || request.url === '/settings/change_login' || request.url === '/settings/change_avatar':
            return await views.user_settings(request, response); //writen by me EC check later
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
        let filePath;
        if (contentType === 'text/css')
            filePath = `css/output.css`; // Resolve the file path
        else
            filePath = path.join(process.cwd(), url); // Resolve the file path
        const fileContent = await fs.readFile(filePath); // Read the file
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(fileContent);
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