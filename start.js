var http = require('http');
var urls = require('./urls');
const db = require('./database/db_user_functions');
const PORT = 8080;


const server = http.createServer(async function (req, res) {
	try {
		const {content, data} = await urls.urlpattern(req, res);
		console.log(data);
		if (data !== null) {
			res.writeHead(200, {'Content-Type': content});
			res.write(data);
			res.end();
		}
	} catch (exception) {
		console.log(exception);
		res.writeHead(500, {'Content-Type': 'text/plain'});
		res.end('internal server error');
	}
});

server.listen(PORT, '127.0.0.1', () => {
	console.log(`Server listening now on http://127.0.0.1:${PORT}`);
})

