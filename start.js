var http = require('http');
var urls = require('./urls');
const db = require('./database/db_user_functions');
const db2 = require('./database/db_main');
const PORT = 8080;


const server = http.createServer(async function (req, res) {
	await db2.create_db();
	try {
		await urls.urlpattern(req, res);
	} catch (exception) {
		console.log(exception);
	}
});

server.listen(PORT, '127.0.0.1', () => {
	console.log(`Server listening now on http://127.0.0.1:${PORT}`);
})

