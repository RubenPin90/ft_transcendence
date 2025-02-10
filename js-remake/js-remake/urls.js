const views = require('./views')

async function urlpattern(request, response) {
	if (request.url === '/' || request.url.includes('?code=')) {
		let  html = await views.home(request, response);
		return html;
	}
	if (request.url === '/login') {
		const html = await views.login(request, response);
		return html
	}
	return '<h1>404 - Seite nicht gefunden</h1>';
}

module.exports = {
	urlpattern
}