var http = require('http');
var urls = require('./urls');
const db = require('./database/db_user_functions');

const server = http.createServer(async function (req, res) {
	try {
		const data = await urls.urlpattern(req, res);
		if (data === null) {
			res.writeHead(302, {
				'Location': '/login'
			});
			res.end();
		} else {
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data);
			res.end();
		}
	} catch (exception) {
		console.log(exception);
		res.writeHead(500, {'Content-Type': 'text/plain'});
		res.end('internal server error');
	}
});

server.listen(8080, '127.0.0.1', () => {
	console.log("Server listening now on 127.0.0.1:8080");
})