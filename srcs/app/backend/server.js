import { matchManager as MatchManagerClass, GAME_MODES }
  from './matchManager.js';

import { tournamentManager } from './tournamentManager.js';
import { handleClientMessage } from './messageHandler.js';

import Fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';
// import staticJs from './plugins/static-js.js';
import WebSocket, { WebSocketServer } from 'ws';
// import ejs from 'ejs'
import os from 'os';


// import { createGameAI } from './matchMaking.js'
import { matchManager, GAME_MODES } from './matchManager.js'
import { handleClientMessage } from './messageHandler.js'
import { tournamentManager } from './tournamentManager.js'

import urlsPlugin from './urls.js';

const PORT = 8080;


// Helper to get __dirname in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Fastify
const fastify = Fastify({ 
  logger: false,
  bodyLimit: 2 * 1024 * 1024,
 });

// Serve /public
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../client/js'),
  prefix: '/client/js/',
})


function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

fastify.get('/*', (req, rep) =>
  rep.sendFile('menu.html', path.join(__dirname, '../templates'))
);

await fastify.listen({ port: 3000, host: '0.0.0.0' });
const server = fastify.server;

const wss = new WebSocketServer({ noServer: true });

export const matchManager = new MatchManagerClass(wss);

tournamentManager.matchManager = matchManager;

tournamentManager.setSocketServer(wss);
tournamentManager.setUserSockets(matchManager.userSockets);

matchManager.on('matchFinished', ({ roomId, winnerId }) => {
  const room = tournamentManager.rooms[roomId];
  if (room) {
    tournamentManager.reportMatchResult(room.tournamentId, roomId, winnerId);
  }
});

setInterval(() => {
  tournamentManager.broadcastTournamentUpdate();
}, 1000);

const initialTournaments = [];
for (let i = 0; i < 3; i++) {
  const tourney = tournamentManager.createTournament(null, 'SERVER');
  console.log(`🌟 Auto-created tournament ${tourney.id} (code: ${tourney.code})`);
}

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/ws/game')) {
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

// ---------- WS connection ----------
wss.on('connection', (ws, req) => {
  let userId;
  do {
    userId = 'user_' + (Math.random() * 10000 | 0);
  } while (matchManager.userSockets.has(userId));

  ws.userId = userId;
  ws.inGame = false;
  ws.currentGameId = null;

  console.log('🔌  WS connected:', userId);

  matchManager.registerSocket(userId, ws);

  ws.on('message', raw => handleClientMessage(ws, raw, matchManager));

  ws.on('close', () => {
    console.log('❌  WS closed:', userId);
    tournamentManager.leaveTournament(userId, null);
    matchManager.unregisterSocket(userId);

    if (ws.inGame) {
      matchManager.leaveRoom(ws.currentGameId, userId);
    }
  })
})

// ---- HANDLE SIGINT -----
const handleSIGINT = () => {
  wss.close(() => {
    fastify.close(() => {
      process.exit(0)
    })
  })
}

process.on('SIGTERM', handleSIGINT)
