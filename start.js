import http from 'http';
import * as urls from './urls.js';
const PORT = 8080;
import * as settings_db from './database/db_settings_functions.js';


const server = http.createServer(async function (req, res) {
	// console.log(await settings_db.get_settings());
	try {
		// console.log(await settings_db.get_settings());
		const returned = await urls.url_pattern(req, res);
	} catch (exception) {
		console.log(exception);
	}
});

server.listen(PORT, '127.0.0.1', () => {
	console.log(`Server listening now on http://127.0.0.1:${PORT}`);
})

