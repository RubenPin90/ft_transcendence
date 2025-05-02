import Fastify from 'fastify'
import path from 'path'
import { fileURLToPath } from 'url'
import fastifyStatic from '@fastify/static'
import staticJs from '../plugins/static-js.js'
import { createGameAI } from './matchMaking.js'
import WebSocket, { WebSocketServer } from 'ws';
import { matchManager, GAME_MODES } from './matchManager.js'
import { handleClientMessage } from './messageHandler.js'

// Helper to get __dirname in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Fastify
const fastify = Fastify({ logger: true })

// Serve /public
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/public/',
})

// Serve /client/js via plugin
await fastify.register(staticJs)

fastify.get('/*', async (request, reply) => {
  return reply.sendFile('menu.html', path.join(__dirname, '../templates'))
})

// Start Fastify HTTP server
const httpServer = await fastify.listen({ port: 3000, host: '0.0.0.0' });
const server = fastify.server

// ---- CREATE OUR WEBSOCKET SERVER ----
const wss = new WebSocketServer({ noServer: true })

// ---- CREATE THE MATCH MANAGER INSTANCE ----
const MatchManager = new matchManager(wss)

/**
 * For simple matchmaking, we’ll keep arrays of "waiting" users for 1v1 & custom modes.
 * Once we find enough players, we create/join a room using matchManager.
 */
const waiting1v1Players = []
const waitingTournamentPlayers = []

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

// ---- MAIN WEBSOCKET CONNECTION HANDLER ----
wss.on('connection', (ws, request) => {
  console.log('🔌 New WebSocket connection');

  ws.userId        = 'user_' + Math.floor(Math.random() * 10000);
  ws.inGame        = false;
  ws.currentGameId = null;

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


