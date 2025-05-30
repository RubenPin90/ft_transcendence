// server.js
import Fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';
import WebSocket, { WebSocketServer } from 'ws';
import os from 'os';

import { SocketRegistry } from './socketRegistry.js';
import { MatchManager, GAME_MODES } from './game/matchManager.js';
import { handleClientMessage } from './game/messageHandler.js';
import { TournamentManager } from './game/tournamentManager.js';
import urlsPlugin from './urls.js';

const PORT = 8080;

// Helper to get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Fastify
const fastify = Fastify({
  logger: false,
  bodyLimit: 2 * 1024 * 1024,
});

// Serve /client/js static files
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../client/js'),
  prefix: '/client/js/',
});

// Register routes from urls.js
await fastify.register(urlsPlugin);

// Start the server
await fastify.listen({ port: PORT, host: '0.0.0.0' });
const server = fastify.server;
console.log(`Server running at http://localhost:${PORT}`);

// Setup WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Instantiate managers
const socketRegistry = new SocketRegistry();
const matchManager = new MatchManager(socketRegistry);
const tournamentManager = new TournamentManager(socketRegistry, matchManager);

tournamentManager.matchManager = matchManager; // Wire matchManager into tournamentManager if needed
matchManager.tournamentManager = tournamentManager; // Optional: wire back if needed

// Broadcast tournament state every second
setInterval(() => {
  tournamentManager.broadcastTournamentUpdate();
}, 5000);

// Create initial tournaments from SERVER
for (let i = 0; i < 3; i++) {
  tournamentManager.createTournament(null, 'SERVER');
}

// Handle WebSocket upgrade requests
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/ws/game')) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  let userId;
  do {
    userId = 'user_' + (Math.random() * 10000 | 0);
  } while (socketRegistry.has(userId));

  ws.userId = userId;
  ws.inGame = false;
  ws.currentGameId = null;

  console.log('🔌 WS connected:', userId);

  matchManager.registerSocket(userId, ws);

  ws.on('message', (raw) => handleClientMessage(ws, raw, matchManager, tournamentManager));

  ws.on('close', () => {
    console.log('❌ WS closed:', userId);
    tournamentManager.leaveTournament(userId);
    matchManager.unregisterSocket(userId);

    if (ws.inGame) {
      matchManager.leaveRoom(ws.currentGameId, userId);
    }
  });
});


// Graceful shutdown
// const handleSIGINT = () => {
//   wss.close(() => {
//     fastify.close(() => {
//       process.exit(0);
//     });
//   });
// };

// process.on('SIGTERM', handleSIGINT);
// process.on('SIGINT', handleSIGINT); // For Ctrl+C too
