import * as views from './views.js';
import * as mimes from './mimes.js';
import * as utils from './utils.js';
import * as send from './responses.js';

async function urlpattern(request, response) {
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
        case request.url.includes(".js"):
            return await mimes.get_js(request.url, response);
        default:
            return await send.send_error_page("404.html", response, 404);
    }
}

export {
	urlpattern
}