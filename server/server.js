import Fastify from 'fastify'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import fastifyStatic from '@fastify/static'
import staticJs from '../plugins/static-js.js'
import { startGameLoop } from './gameLogic.js'

// Helper to get __dirname in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fastify = Fastify({ logger: true })

// Serve /public
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/public/',
})

// Serve /client/js via plugin
await fastify.register(staticJs)

// Example route handlers
fastify.get('/*', async (request, reply) => {
  return reply.sendFile('menu.html', path.join(__dirname, '../templates'))
})

// Start Fastify server
const httpServer = await fastify.listen({ port: 3000 })
const server = fastify.server

// -- WebSocket Setup --
const wss = new WebSocketServer({ noServer: true });

/** 
 * Simple memory-based queues. 
 * For more advanced usage, you'd store waiting players in a DB or in a better data structure.
 */
server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/ws/game')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy(); // or handle other paths
  }
});


const waiting1v1Players = []
const waitingDeathmatchPlayers = []

// Generate a simple random game ID
function generateGameId() {
  return 'match_' + Math.random().toString(36).substr(2, 9)
}

/**
 * Matchmaking logic for 1v1:
 *  - If someone is already waiting, pair them with the new arrival.
 *  - Otherwise, push the new arrival into the waiting list.
 */
function joinQueue1v1(userId, ws) {
  if (waiting1v1Players.length > 0) {
    // There's someone waiting, match them
    const other = waiting1v1Players.shift()  // remove first
    const gameId = generateGameId()

    // Notify both players that a match is found
    ws.send(JSON.stringify({
      type: 'matchFound',
      payload: {
        gameId,
        mode: '1v1',
        opponentId: other.userId,
      }
    }))

    other.ws.send(JSON.stringify({
      type: 'matchFound',
      payload: {
        gameId,
        mode: '1v1',
        opponentId: userId,
      }
    }))

    console.log(`1v1 match found between ${userId} and ${other.userId} (gameId = ${gameId})`)
  } else {
    // No one is waiting yet, so the user must wait
    waiting1v1Players.push({ userId, ws })
    console.log(`${userId} is now waiting for a 1v1 match...`)
  }
}

/**
 * Example logic for a "deathmatch" mode,
 * requiring e.g. 4 players (or 6, you decide) for a match to start.
 */
function joinQueueDeathmatch(userId, ws) {
  waitingDeathmatchPlayers.push({ userId, ws })
  console.log(`${userId} queued for deathmatch. Currently: ${waitingDeathmatchPlayers.length} waiting.`)

  // For example, once we have 4 players, we start
  const REQUIRED_PLAYERS = 4
  if (waitingDeathmatchPlayers.length >= REQUIRED_PLAYERS) {
    // Slice first 4
    const group = waitingDeathmatchPlayers.splice(0, REQUIRED_PLAYERS)
    const gameId = generateGameId()

    // Notify them all
    group.forEach((p) => {
      p.ws.send(JSON.stringify({
        type: 'matchFound',
        payload: {
          gameId,
          mode: 'deathmatch',
          players: group.map(g => g.userId)  // an array of userIDs in the match
        }
      }))
    })

    console.log(`Deathmatch started with ${REQUIRED_PLAYERS} players (gameId = ${gameId})`)
  }
}

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection')

  // In a real app, you'd confirm the user's identity 
  // (e.g. from a token) or handle "login" messages here.
  // For now, let's generate a random userId for demonstration:
  ws.userId = 'user_' + Math.floor(Math.random() * 10000)

  ws.on('message', (rawMsg) => {
    console.log('📨 Message received:', rawMsg.toString())

    // 1. Parse the incoming JSON safely
    let data
    try {
      data = JSON.parse(rawMsg)
    } catch (err) {
      console.error('Invalid JSON:', err)
      return
    }

    // 2. Switch on data.type
    switch (data.type) {
      // 1) Basic broadcast example (already in your code)
      case 'chat':
        // You might forward this to others or store in DB, etc.
        // For now, just broadcast the chat message
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === ws.OPEN) {
            client.send(JSON.stringify({ type: 'chat', payload: data.payload }))
          }
        })
        break

      // 2) Lobby / matchmaking
      case 'joinQueue': {
        const { mode } = data.payload
        // We assume you pass userId from the client. If not, use ws.userId
        const userId = data.payload.userId || ws.userId

        if (mode === '1v1') {
          joinQueue1v1(userId, ws)
        } else if (mode === 'deathmatch') {
          joinQueueDeathmatch(userId, ws)
        }
        break
      }

      // If you had more specialized messages like "move" or "leave", handle them here
      default:
        console.log('Unknown message type:', data.type)
    }
  })

  ws.on('close', () => {
    console.log('❌ WebSocket disconnected')
    // If they were in a queue, remove them, or handle it if needed
    // ...
  })
})


// -- Existing "state" broadcast logic + game loop --
function createBroadcastState(wss) {
  return function broadcastState(state) {
    const msg = JSON.stringify({ type: 'state', state })
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(msg)
      }
    })
  }
}
const broadcastState = createBroadcastState(wss)
startGameLoop(broadcastState)
