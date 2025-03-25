import http from 'http';
import * as urls from './urls.js';
const PORT = 8080;


const server = http.createServer(async function (req, res) {
	try {
		await urls.urlpattern(req, res);
	} catch (exception) {
		console.log(exception);
	}
});

server.listen(PORT, '127.0.0.1', () => {
	console.log(`Server listening now on http://127.0.0.1:${PORT}`);
})

