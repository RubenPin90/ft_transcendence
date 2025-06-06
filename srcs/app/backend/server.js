// server.js

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import urlsPlugin from './urls.js';

import { SocketRegistry } from './socketRegistry.js';
import { MatchManager } from './game/matchManager.js';
import { TournamentManager } from './game/tournamentManager.js';
import { handleClientMessage } from './game/messageHandler.js';
import * as modules from './modules.js';
import * as utils from './utils.js';
import { login } from './views.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 8080;

// ───── create managers ─────
const socketRegistry = new SocketRegistry();
const matchManager = new MatchManager(socketRegistry);
const tournamentManager = new TournamentManager(socketRegistry, matchManager);
tournamentManager.matchManager = matchManager;
matchManager.tournamentManager = tournamentManager;

// ───── create tournaments ─────
setInterval(() => tournamentManager.broadcastTournamentUpdate(), 3000);
for (let i = 0; i < 3; i++) tournamentManager.createTournament(null, 'SERVER');

// ───── initialize fastify ─────
const fastify = Fastify({ logger: false });

// ───── plugins ─────
await fastify.register(urlsPlugin);
await fastify.register(fastifyCookie);
await fastify.register(websocket);
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../client/js'),
  prefix: '/client/js/',
});


fastify.get('/ws/game', { websocket: true }, (conn, req) => {
  const ws = conn;

  const [keys, values] = modules.get_cookies(req);
  console.log('keys and values', keys, values);
  const user_encrypted = values[keys.indexOf("token")];
  const userId = modules.get_jwt(user_encrypted).userid;
  console.log('userId:', userId);
  console.log('🔑 ws token verified:', userId);


  /* 3. attach bookkeeping props */
  ws.userId        = userId;
  ws.inGame        = false;
  ws.currentGameId = null;
  //db_userId_status(userId, online)

  console.log('🔌 ws authenticated:', userId);
  ws.send(JSON.stringify({ type: 'welcome', payload: { userId } }));

  /* 4. wire managers */
  socketRegistry.add(userId, ws);
  matchManager.registerSocket(userId, ws);

  ws.on('message', raw =>{
    handleClientMessage(ws, raw, matchManager, tournamentManager)
  });

  ws.on('close', () => {
    console.log('❌ ws closed:', userId);
    //db_userId_status(userId, offline)
    tournamentManager.leaveTournament(userId);
    matchManager.unregisterSocket(userId);
    socketRegistry.remove(userId);
    if (ws.inGame) matchManager.leaveRoom(ws.currentGameId, userId);
  });
});


await fastify.listen({ port: PORT, host: '0.0.0.0' });
