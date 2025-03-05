// Installation der notwendigen Pakete:
// npm install speakeasy qrcode

const http = require('http');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Geheimen Schlüssel generieren
const secret = speakeasy.generateSecret({ name: 'Mein Testprojekt' });

// HTTP-Server erstellen
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    // QR-Code und Eingabefeld anzeigen
    res.writeHead(200, { 'Content-Type': 'text/html' });
    qrcode.toDataURL(secret.otpauth_url, (err, url) => {
      if (err) {
        res.end('Fehler beim Generieren des QR-Codes');
        return;
      }
      res.end(`
        <h1>Hier ist dein Google Authenticator Code</h1>
        <p>Scanne den QR-Code mit der Google Authenticator App:</p>
        <img src="${url}" alt="QR Code" />
        <h2>Code überprüfen</h2>
        <form action="/verify" method="post">
          <input type="text" name="token" placeholder="Gib den Code ein" required />
          <button type="submit">Überprüfen</button>
        </form>
      `);
    });
  } else if (req.method === 'POST' && req.url === '/verify') {
    // Eingabedaten prüfen
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const full_token = new URLSearchParams(body);
      console.log(full_token);
      const token = full_token.get('token');
      const verified = speakeasy.totp.verify({
        secret: secret.base32,
        encoding: 'base32',
        token
      });
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        verified
          ? '<h1>✅ Code ist korrekt!</h1>'
          : '<h1>❌ Code ist ungültig!</h1>'
      );
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Seite nicht gefunden');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

// Jetzt kannst du den QR-Code scannen, Codes generieren und sie direkt im Browser prüfen! 🚀
