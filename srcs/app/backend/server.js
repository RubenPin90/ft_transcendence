// server.js

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { SocketRegistry } from './socketRegistry.js';
import { MatchManager } from './game/matchManager.js';
import { TournamentManager } from './game/tournamentManager.js';
import handleShutdown from './signals.js';
import * as urlsPlugin from './urls.js';
import * as modules from './modules.js';
import {handleClientMessage} from './game/messageHandler.js'
import * as users_db from '../database/db_users_functions.js';

const PORT = 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const socketRegistry = new SocketRegistry();
const matchManager = new MatchManager(socketRegistry);
const tournamentManager = new TournamentManager(socketRegistry, matchManager);
tournamentManager.matchManager = matchManager;
matchManager.tournamentManager = tournamentManager;


for (let i = 0; i < 3; i++) tournamentManager.createTournament(null, 'SERVER');

setInterval(() => tournamentManager.broadcastTournamentUpdate(), 3000);

const fastify = Fastify({ logger: false });

await fastify.register(urlsPlugin);
await fastify.register(fastifyCookie);
await fastify.register(websocket);
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../client/js'),
  prefix: '/client/js/',
});


fastify.get('/ws/game', { websocket: true }, async(conn, req) => {
  // console.log('→ Incoming WS handshake on /ws/game from', req.ip);
  const ws = conn;

  const [keys, values] = modules.get_cookies(req);
  // console.log('keys and values', keys, values);
  const user_encrypted = values[keys.indexOf("token")];
  const temp = await modules.get_jwt(user_encrypted);
  if (!temp || !temp.userid) {
    console.error('❌ Invalid or missing token:', user_encrypted);
    ws.close(1008, 'Invalid token');
    return;
  } 
  const userId = String(temp.userid);
  console.log('userId.userId:', userId);
  console.log('🔑 ws token verified:', userId);

  const user_db = await users_db.get_users_value('self', userId);
  ws.userId        = userId;
  ws.username = user_db.username;
  ws.inGame        = false;
  ws.currentGameId = null;
  await users_db.update_users_value('status', 'online', userId);
  //db_userId_status(userId, online)

  console.log('🔌 ws authenticated:', userId);
  ws.send(JSON.stringify({ type: 'welcome', payload: { userId } }));

  if (socketRegistry.has(userId))
  {
    console.log('detected double connection');
    ws.close(1000, 'detected double connection');
    socketRegistry.remove(userId);
    return;
  }

  socketRegistry.add(userId, ws);
  matchManager.registerSocket(userId, ws);

  ws.on('message', raw =>{
    handleClientMessage(ws, raw, matchManager, tournamentManager)
  });

  ws.on('close', async () => {
    console.log('❌ ws closed:', userId);
    await users_db.update_users_value('status', 'offline', userId);
    if (ws.inGame) matchManager.leaveRoom(ws.currentGameId, userId);
    tournamentManager.leaveTournament(userId);
    matchManager.unregisterSocket(userId);
    socketRegistry.remove(userId);
  });
});


await fastify.listen({ port: PORT, host: '0.0.0.0' });
handleShutdown({ fastify });
export {
  fastify
}

