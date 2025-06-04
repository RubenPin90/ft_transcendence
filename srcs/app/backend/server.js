// server.js

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

import { SocketRegistry } from './socketRegistry.js';
import { MatchManager } from './game/matchManager.js';
import { TournamentManager } from './game/tournamentManager.js';
import { handleClientMessage } from './game/messageHandler.js';
import * as modules from './modules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 8080;

// ───── create managers ─────
const socketRegistry = new SocketRegistry();
const matchManager = new MatchManager(socketRegistry);
const tournamentManager = new TournamentManager(socketRegistry, matchManager);
tournamentManager.matchManager = matchManager;
matchManager.tournamentManager = tournamentManager;

// ───── create tournaments ─────
setInterval(() => tournamentManager.broadcastTournamentUpdate(), 3000);
for (let i = 0; i < 3; i++) tournamentManager.createTournament(null, 'SERVER');

// ───── initialize fastify ─────
const fastify = Fastify({ logger: true });

// ───── plugins ─────
await fastify.register(fastifyCookie);
await fastify.register(websocket);
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../client/js'),
  prefix: '/client/js/',
});

// ───── WebSocket route ─────
fastify.get('/ws/game', { websocket: true }, async (conn, req) => {
  
  
  const [keys, values] = modules.get_cookies(req);
  await utils.check_for_invalid_token(req, response, keys, values);
  if (!keys?.includes('token'))
    return await login(req, response);        // → [keys, values]  or  null
  const user_decryted = values[keys?.indexOf("token")];
  const userid = modules.get_jwt(user_decryted).userid;

  if (!token) {
    console.error('❌ WS: token cookie missing');
    ws.close(4000, 'auth-required');   // custom close code
    return;
  }


  const ws = conn.socket;
  ws.userId = userId;
  ws.inGame = false;
  ws.currentGameId = null;

  console.log('🔌 WS authenticated:', userId);
  ws.send(JSON.stringify({ type: 'welcome', payload: { userId } }));

  socketRegistry.register(userId, ws);
  matchManager.registerSocket(userId, ws);

  ws.on('message', raw => {
    handleClientMessage(ws, raw, matchManager, tournamentManager);
  });

  ws.on('close', () => {
    console.log('❌ WS closed:', userId);
    tournamentManager.leaveTournament(userId);
    matchManager.unregisterSocket(userId);
    socketRegistry.unregister(userId);
    if (ws.inGame) matchManager.leaveRoom(ws.currentGameId, userId);
  });
});

// ───── start server ─────
await fastify.listen({ port: PORT, host: '0.0.0.0' });


// Handle WebSocket connections
// wss.on('connection', async (ws, req) => {
//   /* ───────────────── 1. pull the token ─────────────────────────── */


//   // (b) If staying with your helper:

  
//   const [keys, values] = modules.get_cookies(req);
//   await utils.check_for_invalid_token(req, response, keys, values);
//   if (!keys?.includes('token'))
//     return await login(req, response);        // → [keys, values]  or  null
//   const user_decryted = values[keys?.indexOf("token")];
//   const userid = modules.get_jwt(user_decryted).userid;

//   if (!token) {
//     console.error('❌ WS: token cookie missing');
//     ws.close(4000, 'auth-required');   // custom close code
//     return;
//   }


//   /* ───────────────── 3. register socket  ───────────────────────── */

//   ws.userId        = userId;
//   ws.inGame        = false;
//   ws.currentGameId = null;

//   console.log('🔌 WS authenticated:', userId);
//   ws.send(JSON.stringify({ type: 'welcome', payload: { userId } }));

//   socketRegistry.register(userId, ws);
//   matchManager.registerSocket(userId, ws);

//   /* ───────────────── 4. message + close handlers ───────────────── */

//   ws.on('message', (raw) =>
//     handleClientMessage(ws, raw, matchManager, tournamentManager)
//   );

//   ws.on('close', () => {
//     console.log('❌ WS closed:', userId);
//     tournamentManager.leaveTournament(userId);
//     matchManager.unregisterSocket(userId);
//     socketRegistry.unregister(userId);           // if your registry needs it
//     if (ws.inGame) matchManager.leaveRoom(ws.currentGameId, userId);
//   });
// });


// import Fastify from 'fastify';
// import fastifyCookie from 'fastify-cookie'; 
// import path from 'path';
// import { fileURLToPath } from 'url';
// import fastifyStatic from '@fastify/static';
// import WebSocket, { WebSocketServer } from 'ws';
// import os from 'os';

// import { SocketRegistry } from './socketRegistry.js';
// import { MatchManager, GAME_MODES } from './game/matchManager.js';
// import { handleClientMessage } from './game/messageHandler.js';
// import { TournamentManager } from './game/tournamentManager.js';
// import urlsPlugin from './urls.js';
// import * as modules from './modules.js';
// import * as utils from './utils.js';

// const PORT = 8080;

// // Helper to get __dirname in ES module
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Initialize Fastify
// const fastify = Fastify({
//   logger: false,
//   bodyLimit: 2 * 1024 * 1024,
// });

// // Serve /client/js static files
// await fastify.register(fastifyStatic, {
//   root: path.join(__dirname, '../client/js'),
//   prefix: '/client/js/',
// });

// await fastify.register(fastifyCookie);

// // Register routes from urls.js
// await fastify.register(urlsPlugin);

// // Start the server
// await fastify.listen({ port: PORT, host: '0.0.0.0' });
// const server = fastify.server;
// // console.log(`Server running at http://localhost:${PORT}`);

// // Setup WebSocket server
// const wss = new WebSocketServer({ noServer: true });

// // Instantiate managers
// const socketRegistry = new SocketRegistry();
// const matchManager = new MatchManager(socketRegistry);
// const tournamentManager = new TournamentManager(socketRegistry, matchManager);

// tournamentManager.matchManager = matchManager; // Wire matchManager into tournamentManager if needed
// matchManager.tournamentManager = tournamentManager; // Optional: wire back if needed

// // Broadcast tournament state every second
// setInterval(() => {
//   tournamentManager.broadcastTournamentUpdate();
// }, 3000);

// // Create initial tournaments from SERVER
// for (let i = 0; i < 3; i++) {
//   tournamentManager.createTournament(null, 'SERVER');
// }
