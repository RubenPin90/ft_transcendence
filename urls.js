const views = require('./views');
const mimes = require('./mimes');

async function urlpattern(request, response) {
	if (request.url === '/' || request.url.includes('?code=')) {
		let html = await views.home(request, response);
		return { content: "text/html", data: html };
	}
	if (request.url === '/login') {
		const html = await views.login(request, response);
		return { content: "text/html", data: html };
	} else if (request.url === '/register') {
		const html = await views.register(request, response);
		return { content: "text/html", data: html };
	}
	if (request.url.includes(".js")) {
		const mime = await mimes.get_js(request.url);
		return { content: "application/javascript", data: mime};
	}
	return  { content: "text/html", data: '<h1>404 - Seite nicht gefunden</h1>'};
}

module.exports = {
	urlpattern
}