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
 * In production, store waiting players in a DB or more robust data structures.
 */
const waiting1v1Players = []
const waitingDeathmatchPlayers = []

// Utility: remove a userId from a given queue array
function removeFromQueue(queue, userId) {
  const idx = queue.findIndex((p) => p.userId === userId);
  if (idx !== -1) {
    queue.splice(idx, 1);
  }
}

// Generate a random game ID
function generateGameId() {
  return 'match_' + Math.random().toString(36).substr(2, 9)
}

/**
 * Matchmaking for 1v1:
 *  - If someone is already waiting, pair them with the new arrival.
 *  - Otherwise, push the new arrival to waiting list.
 */
function joinQueue1v1(userId, ws) {
  if (waiting1v1Players.length > 0) {
    // There's someone waiting, match them
    const other = waiting1v1Players.shift()  // remove the first in the queue
    const gameId = generateGameId()

    // Mark both players as inGame
    ws.inGame = true
    other.ws.inGame = true

    // For demonstration, store the same gameId if you want to track it:
    ws.currentGameId = gameId
    other.ws.currentGameId = gameId

    // Notify both that a match is found
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
 * Example "deathmatch" mode:
 *  - Let's say we need 4 players to start a match.
 */
function joinQueueDeathmatch(userId, ws) {
  waitingDeathmatchPlayers.push({ userId, ws })
  console.log(`${userId} queued for deathmatch. Currently: ${waitingDeathmatchPlayers.length} waiting.`)

  const REQUIRED_PLAYERS = 4
  if (waitingDeathmatchPlayers.length >= REQUIRED_PLAYERS) {
    // Collect first 4
    const group = waitingDeathmatchPlayers.splice(0, REQUIRED_PLAYERS)
    const gameId = generateGameId()

    group.forEach((p) => {
      // Mark them as inGame
      p.ws.inGame = true
      p.ws.currentGameId = gameId

      // Notify each that a match is found
      p.ws.send(JSON.stringify({
        type: 'matchFound',
        payload: {
          gameId,
          mode: 'deathmatch',
          players: group.map(g => g.userId)
        }
      }))
    })

    console.log(`Deathmatch started with ${REQUIRED_PLAYERS} players (gameId = ${gameId})`)
  }
}

// Setup upgrade so we can handle /ws/game
server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/ws/game')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy(); // handle other paths
  }
});

// ---- The main WebSocket connection handler ----
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection')

  // In a real app, you'd confirm the user's identity 
  // (e.g. from a token) or handle "login" messages
  // For now, just a random userId:
  ws.userId = 'user_' + Math.floor(Math.random() * 10000)
  // By default, not in a game
  ws.inGame = false
  ws.currentGameId = null

  ws.on('message', (rawMsg) => {
    console.log('📨 Message received:', rawMsg.toString())
    let data
    try {
      data = JSON.parse(rawMsg)
    } catch (err) {
      console.error('Invalid JSON:', err)
      return
    }

    switch (data.type) {
      // Basic chat broadcast
      case 'chat': {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === ws.OPEN) {
            client.send(JSON.stringify({
              type: 'chat',
              payload: data.payload
            }))
          }
        })
        break
      }

      // Lobby / matchmaking
      case 'joinQueue': {
        const { mode } = data.payload
        const userId = data.payload.userId || ws.userId

        if (mode === '1v1') {
          joinQueue1v1(userId, ws)
        } else if (mode === 'deathmatch') {
          joinQueueDeathmatch(userId, ws)
        }
        break
      }

      // Graceful "leave game" / "surrender"
      case 'leaveGame': {
        // Mark them as not in a game
        ws.inGame = false
        ws.currentGameId = null
        // Possibly notify opponents or remove from the match
        // ...
        console.log(`${ws.userId} left the game (voluntary).`)
        break
      }

      // If you have specialized messages like "movePaddle", handle them here
      default:
        console.log('Unknown message type:', data.type)
    }
  })

  ws.on('close', () => {
    console.log(`❌ WebSocket disconnected (userId = ${ws.userId})`)

    // If they were in the 1v1 queue, remove them
    removeFromQueue(waiting1v1Players, ws.userId)

    // If they were in the deathmatch queue, remove them
    removeFromQueue(waitingDeathmatchPlayers, ws.userId)

    // If ws.inGame === true, treat it as a forfeit or lost connection
    if (ws.inGame) {
      console.log(`--> They were in a match. Marking as forfeit/disconnect.`)
      // In a real app, you might notify the opponent(s).
      ws.inGame = false
      ws.currentGameId = null
    }
  })
})

// -- Game State Broadcast & Loop --
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
