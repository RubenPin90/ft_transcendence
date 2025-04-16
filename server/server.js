import Fastify from 'fastify'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import fastifyStatic from '@fastify/static'
import staticJs from '../plugins/static-js.js'
import { startGameLoop } from './gameLogic.js'

// --------- IMPORT YOUR MATCH MANAGER -----------
import { MatchManager, GAME_MODES } from './MatchManager.js'

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

// Example route handlers (you can adapt these to your needs)
fastify.get('/*', async (request, reply) => {
  return reply.sendFile('menu.html', path.join(__dirname, '../templates'))
})

// Start Fastify HTTP server
const httpServer = await fastify.listen({ port: 3000 })
const server = fastify.server

// ---- CREATE OUR WEBSOCKET SERVER ----
const wss = new WebSocketServer({ noServer: true })

// ---- CREATE THE MATCH MANAGER INSTANCE ----
const matchManager = new MatchManager()

/**
 * For simple matchmaking, we’ll keep arrays of "waiting" users for 1v1 & custom modes.
 * Once we find enough players, we create/join a room using matchManager.
 */
const waiting1v1Players = []
const waitingCustomgamePlayers = []

// Utility: remove a userId from a given queue array
function removeFromQueue(queue, userId) {
  const idx = queue.findIndex((p) => p.userId === userId)
  if (idx !== -1) {
    queue.splice(idx, 1)
  }
}

// PVE: Create a game against AI
function createGameAI(userId, ws) {
  // Create a new PVE room via matchManager
  const room = matchManager.createRoom({
    mode: GAME_MODES.PVE,
    maxPlayers: 2,
    creatorId: userId,
  })

  // Add the user to that room
  matchManager.joinRoom(room.roomId, userId)

  // Mark them in the server WebSocket as "inGame"
  ws.inGame = true
  ws.currentGameId = room.roomId

  // Notify the user
  ws.send(JSON.stringify({
    type: 'matchFound',
    payload: {
      gameId: room.roomId,
      mode: 'PVE',
      opponentId: 'BOT', // We'll treat 'BOT' as the AI
    },
  }))

  console.log(`PVE match created for ${userId} vs AI (roomId = ${room.roomId})`)
}

// 1v1 matchmaking: when a new user arrives, see if we already have someone in queue
function joinQueue1v1(userId, ws) {
  if (waiting1v1Players.length > 0) {
    // There's somebody waiting
    const other = waiting1v1Players.shift() // remove first from the queue

    // Create a new 1v1 match (PVP) via matchManager
    const room = matchManager.createRoom({
      mode: GAME_MODES.PVP,
      maxPlayers: 2,
    })

    // Add both players to that room
    matchManager.joinRoom(room.roomId, other.userId)
    matchManager.joinRoom(room.roomId, userId)

    // Mark them in the server WebSocket as "inGame"
    ws.inGame = true
    other.ws.inGame = true
    ws.currentGameId = room.roomId
    other.ws.currentGameId = room.roomId

    // Notify both
    ws.send(JSON.stringify({
      type: 'matchFound',
      payload: {
        gameId: room.roomId,
        mode: '1v1',
        opponentId: other.userId,
      },
    }))

    other.ws.send(JSON.stringify({
      type: 'matchFound',
      payload: {
        gameId: room.roomId,
        mode: '1v1',
        opponentId: userId,
      },
    }))

    console.log(`1v1 match found between ${userId} and ${other.userId} — roomId = ${room.roomId}`)
  } else {
    // No one waiting yet; this user waits
    waiting1v1Players.push({ userId, ws })
    console.log(`${userId} is now waiting for a 1v1 match...`)
  }
}

// Example: Custom game requires 4 players
// (In practice, you might create a named "lobby" or let users pick a friend group.)
function joinQueueCustomgame(userId, ws) {
  const REQUIRED_PLAYERS = 4

  waitingCustomgamePlayers.push({ userId, ws })
  console.log(`${userId} queued for a Custom game. Currently: ${waitingCustomgamePlayers.length} waiting.`)

  if (waitingCustomgamePlayers.length >= REQUIRED_PLAYERS) {
    // Take first 4 from the queue
    const group = waitingCustomgamePlayers.splice(0, REQUIRED_PLAYERS)

    // Create a CUSTOM room with up to 4 players
    const room = matchManager.createRoom({
      mode: GAME_MODES.CUSTOM,
      maxPlayers: REQUIRED_PLAYERS,
    })

    // Join each player to that new room
    group.forEach((player) => {
      matchManager.joinRoom(room.roomId, player.userId)
      player.ws.inGame = true
      player.ws.currentGameId = room.roomId
    })

    // Notify each that a match is found
    group.forEach((player) => {
      player.ws.send(JSON.stringify({
        type: 'matchFound',
        payload: {
          gameId: room.roomId,
          mode: 'Customgame',
          players: group.map((g) => g.userId),
        },
      }))
    })

    console.log(`Customgame started with ${REQUIRED_PLAYERS} players (roomId = ${room.roomId})`)
  }
}

// We intercept the HTTP upgrade event to handle "/ws/game" as a WebSocket route.
server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/ws/game')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  } else {
    socket.destroy() // reject upgrades on other paths
  }
})

// ---- MAIN WEBSOCKET CONNECTION HANDLER ----
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection')

  // For demonstration, assign a random userId to each WebSocket
  ws.userId = 'user_' + Math.floor(Math.random() * 10000)
  ws.inGame = false
  ws.currentGameId = null

  ws.on('message', (rawMsg) => {
    let data
    try {
      data = JSON.parse(rawMsg)
    } catch (err) {
      console.error('Invalid JSON message from client:', err)
      return
    }

    switch (data.type) {
      // Basic chat broadcast
      case 'chat': {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === ws.OPEN) {
            client.send(JSON.stringify({
              type: 'chat',
              payload: data.payload,
            }))
          }
        })
        break
      }

      // Lobby / matchmaking
      case 'joinQueue': {
        const { mode } = data.payload
        const userId = data.payload.userId || ws.userId
        console.log('Incoming joinQueue request - mode:', mode)

        if (mode === 'ai') {
          createGameAI(userId, ws)
        } else if (mode === '1v1') {
          joinQueue1v1(userId, ws)
        } else if (mode === 'Customgame') {
          joinQueueCustomgame(userId, ws)
        }
        break
      }

      // Graceful "leave game" / "surrender"
      case 'leaveGame': {
        ws.inGame = false
        ws.currentGameId = null
        console.log(`${ws.userId} left the game voluntarily.`)
        // If you also want to remove them from a match in matchManager, you can call:
        // matchManager.leaveRoom(ws.currentGameId, ws.userId)
        break
      }

      // If you have specialized game events like "movePaddle" or "updateScore", handle them here
      default:
        console.log('Unknown message type:', data.type)
    }
  })

  ws.on('close', () => {
    console.log(`❌ WebSocket disconnected (userId = ${ws.userId})`)

    // If they were in a 1v1 queue, remove them
    removeFromQueue(waiting1v1Players, ws.userId)

    // If they were in the Custom queue, remove them
    removeFromQueue(waitingCustomgamePlayers, ws.userId)

    // If ws.inGame === true, treat it as a forfeit or lost connection
    if (ws.inGame) {
      console.log(`--> ${ws.userId} disconnected while in a match. Marking as forfeit/disconnect.`)
      // Optionally remove them from the match in matchManager
      // matchManager.leaveRoom(ws.currentGameId, ws.userId)
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
