// plugins/static-js.js
import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default fp(async function (fastify) {
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../client/js'),
    prefix: '/client/js/',
    decorateReply: false 
  })
})
