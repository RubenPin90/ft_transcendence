import Fastify from 'fastify'
import path from 'path'
import { fileURLToPath } from 'url'
import fastifyStatic from '@fastify/static'
import staticJs from '../plugins/static-js.js'
import WebSocket, { WebSocketServer } from 'ws';
import ejs from 'ejs'


import { createGameAI } from './matchMaking.js'
import { matchManager, GAME_MODES } from './matchManager.js'
import { handleClientMessage } from './messageHandler.js'
import { tournamentManager } from './tournamentManager.js'

import urlsPlugin from './urls.js';

import http from 'http';
import * as urls from './urls.js';
const PORT = 8080;
import * as settings_db from '../database/db_settings_functions.js';


// Helper to get __dirname in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Fastify
const fastify = Fastify({ logger: false })

// Serve /public
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../client/js'),
  prefix: '/client/js/',
})


// Serve /client/js via plugin
await fastify.register(urlsPlugin); 

// const PORT = 8080;
await fastify.listen({ port: PORT, host: '0.0.0.0' });
const server = fastify.server;               // <-- now defined

console.log(`Server listening at http://127.0.0.1:${PORT}`);
console.log(`Server listening at http://10.0.2.15:${PORT}`);

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/ws/game')) {
    wss.handleUpgrade(req, socket, head, ws =>
      wss.emit('connection', ws, req)
    );
  } else {
    socket.destroy();
  }
});



// Start Fastify HTTP server
// const httpServer = await fastify.listen({ port: 3000, host: '0.0.0.0' });
// const server = fastify.server

// ---- CREATE OUR WEBSOCKET SERVER ----
// const wss = new WebSocketServer({ noServer: true })

// ---- CREATE THE MATCH MANAGER INSTANCE ----
const MatchManager = new matchManager(wss)

tournamentManager.setSocketServer(wss);

/**
 * For simple matchmaking, we’ll keep arrays of "waiting" users for 1v1 & custom modes.
 * Once we find enough players, we create/join a room using matchManager.
 */
const waiting1v1Players = []
const waitingTournamentPlayers = []

const initialTournaments = [];
for (let i = 0; i < 3; i++) {
  const tourney = tournamentManager.createTournament(null, 'SERVER');
  // console.log(`🌟 Auto-created tournament ${tourney.id} (code: ${tourney.code})`);
}

function removeFromQueue(queue, userId) {
  const idx = queue.findIndex((p) => p.userId === userId)
  if (idx !== -1) {
    queue.splice(idx, 1)
  }
}

server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/ws/game')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  } else {
    socket.destroy()
  }
})

setInterval(() => {
  +  tournamentManager.broadcastTournamentUpdate();
}, 1000);

// ---- MAIN WEBSOCKET CONNECTION HANDLER ----
wss.on('connection', (ws, request) => {
  
  ws.userId        = 'user_' + Math.floor(Math.random() * 10000);
  ws.inGame        = false;
  ws.currentGameId = null;
  console.log('🔌 New WebSocket connection with userId:', ws.userId);

  MatchManager.userSockets.set(ws.userId, ws);

  ws.on('message', rawMsg => {
    handleClientMessage(ws, rawMsg, MatchManager)
  })

  ws.on('close', () => {
    console.log(`❌ WebSocket disconnected (userId = ${ws.userId})`)

    removeFromQueue(waiting1v1Players, ws.userId)

    removeFromQueue(waitingTournamentPlayers, ws.userId)
    MatchManager.unregisterSocket(ws.userId)

    if (ws.inGame) {
      console.log(`--> ${ws.userId} disconnected while in a match. Marking as forfeit/disconnect.`)
      MatchManager.leaveRoom(ws.currentGameId, ws.userId)
      ws.inGame = false
      ws.currentGameId = null
    }
  })
})


