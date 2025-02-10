const http = require('http');
const PORT = 3000;

async function test(res) {
  res.setHeader('Set-Cookie', 'message=HelloCookie');
}

const server = http.createServer((req, res) => {
  // Cookie setzen
  test(res);

  // Antwort senden
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World');
});

server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
