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

// Route handlers
fastify.get('/', async (request, reply) => {
  return reply.sendFile('login.html', path.join(__dirname, '../templates'))
})

fastify.get('/game', async (request, reply) => {
  return reply.sendFile('game.html', path.join(__dirname, '../templates'))
})

// Start Fastify server
const httpServer = await fastify.listen({ port: 3000 })
const server = fastify.server

// Initialize WebSocket server
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection')

  ws.on('message', (msg) => {
    console.log('📨 Message received:', msg.toString())

    // Broadcast to all clients except sender
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(msg.toString())
      }
    })
  })

  ws.on('close', () => {
    console.log('❌ WebSocket disconnected')
  })
})

// Factory function that returns a broadcaster with access to the current wss
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

// Start game loop with correct broadcaster
const broadcastState = createBroadcastState(wss)
startGameLoop(broadcastState)
