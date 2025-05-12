import * as views from './views.js';
import * as mimes from './mimes.js';
import * as send from './responses.js';

async function url_pattern(request, response) {
    switch (true) {
        case request.url.includes(".js"):
            // console.log(request.url);
            return await mimes.get_js(request.url, response);
        case request.url === '/':
            return await views.home(request, response);
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
        default:
            return await send.send_error_page("404.html", response, 404);
    }
}

export {
	url_pattern
}