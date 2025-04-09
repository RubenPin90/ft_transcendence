import Fastify from 'fastify'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import fastifyStatic from '@fastify/static'
import staticJs from '../plugins/static-js.js' // <— the plugin you created

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

fastify.get('/', async (request, reply) => {
    return reply.sendFile('login.html', path.join(__dirname, '../templates'))
})

// Route using sendFile (available from main fastifyStatic)
fastify.get('/game', async (request, reply) => {
  return reply.sendFile('game.html', path.join(__dirname, '../templates'))
})

const httpServer = await fastify.listen({ port: 3000 })
const server = fastify.server

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection')

  ws.on('message', (msg) => {
    console.log('📨 Message received:', msg.toString())

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
