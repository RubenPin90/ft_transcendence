const views = require('./views');
const mimes = require('./mimes');
const utils = require('./utils');
const send = require('./responses');

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
        case request.url.includes(".js"):
            return await mimes.get_js(request.url, response);
        default:
            return false
    }
}

module.exports = {
	urlpattern
}