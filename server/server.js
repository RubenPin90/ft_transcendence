import Fastify from 'fastify'
import path from 'path'
import { fileURLToPath } from 'url'
import fastifyStatic from '@fastify/static'
import staticJs from '../plugins/static-js.js'
import { startGameLoop } from './gameLogic.js'
import { createGameAI } from './matchMaking.js'
import WebSocket, { WebSocketServer } from 'ws';
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

fastify.get('/*', async (request, reply) => {
  return reply.sendFile('menu.html', path.join(__dirname, '../templates'))
})

// Start Fastify HTTP server
const httpServer = await fastify.listen({ port: 3000, host: '0.0.0.0' });
const server = fastify.server

// ---- CREATE OUR WEBSOCKET SERVER ----
const wss = new WebSocketServer({ noServer: true })

// ---- CREATE THE MATCH MANAGER INSTANCE ----
const matchManager = new MatchManager(wss)

/**
 * For simple matchmaking, we’ll keep arrays of "waiting" users for 1v1 & custom modes.
 * Once we find enough players, we create/join a room using matchManager.
 */
const waiting1v1Players = []
const waitingCustomgamePlayers = []

function removeFromQueue(queue, userId) {
  const idx = queue.findIndex((p) => p.userId === userId)
  if (idx !== -1) {
    queue.splice(idx, 1)
  }
}



function joinQueue1v1(matchManager ,userId, ws, ) {
  if (waiting1v1Players.length > 0) {
    const other = waiting1v1Players.shift() 
    const room = matchManager.createRoom({
      mode: GAME_MODES.PVP,
      maxPlayers: 2,
    })

    matchManager.joinRoom(room.roomId, other.userId)
    matchManager.joinRoom(room.roomId, userId)

    ws.inGame = true
    other.ws.inGame = true
    ws.currentGameId = room.roomId
    other.ws.currentGameId = room.roomId

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
    waiting1v1Players.push({ userId, ws })
    console.log(`${userId} is now waiting for a 1v1 match...`)
  }
}

function joinQueueCustomgame(userId, ws) {
  const REQUIRED_PLAYERS = 4

  waitingCustomgamePlayers.push({ userId, ws })
  console.log(`${userId} queued for a Custom game. Currently: ${waitingCustomgamePlayers.length} waiting.`)

  if (waitingCustomgamePlayers.length >= REQUIRED_PLAYERS) {
    const group = waitingCustomgamePlayers.splice(0, REQUIRED_PLAYERS)

    const room = matchManager.createRoom({
      mode: GAME_MODES.CUSTOM,
      maxPlayers: REQUIRED_PLAYERS,
    })

    group.forEach((player) => {
      matchManager.joinRoom(room.roomId, player.userId)
      player.ws.inGame = true
      player.ws.currentGameId = room.roomId
    })

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
  console.log('🔌 New WebSocket connection')

  // assign a random userId to each WebSocket
  ws.userId = 'user_' + Math.floor(Math.random() * 10000)
  ws.inGame = false
  ws.currentGameId = null
  matchManager.userSockets.set(ws.userId, ws);

  ws.on('message', (rawMsg, request) => {
    let data
    try {
      data = JSON.parse(rawMsg)
    } catch (err) {
      console.error('Invalid JSON message from client:', err)
      return
    }

    switch (data.type) {
      case 'chat': {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'chat',
              payload: data.payload,
            }))
          }
        })
        break
      }

      case 'joinQueue': {
        const { mode } = data.payload
        const userId = data.payload.userId || ws.userId
        console.log('Incoming joinQueue request - mode:', mode)

        if (mode === 'pve') {
          createGameAI(matchManager, userId, ws)
        } else if (mode === '1v1') {
          joinQueue1v1(matchManager, userId, ws)
        } else if (mode === 'Customgame') {
          joinQueueCustomgame(userId, ws)
        }
        break
      }

      case 'leaveGame': {
        ws.inGame = false
        ws.currentGameId = null
        console.log(`${ws.userId} left the game voluntarily.`)
        break
      }
      case 'movePaddle': {
        console.log('Incoming movePaddle request')
        const { dy } = data.payload        
        const room   = matchManager.rooms.get(ws.currentGameId)
        if (!room) break
      
        const player = room.players.find(p => p.playerId === ws.userId)
        if (player) {
          const speed = 1.0                  
          player.paddleY = Math.max(0,
                             Math.min(1, player.paddleY + dy * speed / room.FPS))
        }
        break
      }

      default:
        console.log('Unknown message type:', data.type)
    }
  })

  ws.on('close', () => {
    console.log(`❌ WebSocket disconnected (userId = ${ws.userId})`)

    removeFromQueue(waiting1v1Players, ws.userId)

    removeFromQueue(waitingCustomgamePlayers, ws.userId)
    matchManager.unregisterSocket(ws.userId)

    if (ws.inGame) {
      console.log(`--> ${ws.userId} disconnected while in a match. Marking as forfeit/disconnect.`)
      matchManager.leaveRoom(ws.currentGameId, ws.userId)
      ws.inGame = false
      ws.currentGameId = null
    }
  })
})


