// server/messageHandler.js
import WebSocket from 'ws';
import { createGameAI } from './matchMaking.js';
import { joinQueue1v1, joinQueueTournament } from './matchMaking.js';
import { MatchManager } from './matchManager.js';
import { tournamentManager } from './tournamentManager.js';

export function handleClientMessage(ws, rawMsg, matchManager) {
  let data;
  try {
    data = JSON.parse(rawMsg);
  } catch (err) {
    console.error('Invalid JSON message from client:', err);
    return;
  }
  // //console.log(`Incoming from ${ws.userId}:`);
  // //console.log(data);
  switch (data.type) {
    case 'kickPlayer': {
      //console.log('Incoming kickPlayer request with data:', data);
      const { tournamentId, playerId } = data.payload;
      const userId = ws.userId;
      tournamentManager.kickPlayer(userId, tournamentId, playerId);
      break;
    }
    case 'joinByCode': {
        //console.log('Incoming joinByCode request with data:', data);
        const { code } = data.payload;
        const userId = ws.userId;
        tournamentManager.joinTournament(userId, code, ws);
        break;
    }
    case 'tLobbyState':{
      const current = getCurrentTLobby();
      if (!current || current.id === msg.payload.id) {
        renderTLobby(msg.payload, socket);
      }
      break;
    }
    case 'createTournament': {
      //console.log('Incoming createTournament request with data:', data);
      const tournamentId = tournamentManager.createTournament(ws, ws.userId);
      ws.send(JSON.stringify({
        type:  'tournamentCreated',
        payload: tournamentId,
      }));
      break;
    
    }
    case 'toggleReady':{
      //console.log('Incoming toggleReady request with data:', data);
      const { tournamentId } = data.payload;
      const userId = ws.userId;
      tournamentManager.toggleReady(userId, tournamentId);
      break;
    }
    case 'startTournament': {
      //console.log('Incoming startTournament request with data:', data);
      const { id: tournamentId } = data.payload;
      const userId = ws.userId;
      //console.log('userId:', userId);
      //console.log('tournamentId:', tournamentId);
      tournamentManager.startTournament(tournamentId);
      break;
    }
    case 'leaveTournament': {
      //console.log('Incoming leaveTournament request with data:', data);
      const { tournamentId } = data.payload ?? {};
      const userId = ws.userId;
      tournamentManager.leaveTournament(userId, tournamentId);
      break;
    }
    case 'joinMatchRoom': {
      const { tournamentId, matchId } = data.payload;
      const userId = ws.userId;                     // you already attach this on login
      //console.log('Incoming joinMatchRoom request with data:', data);



      const room = tournamentManager.rooms[matchId];
      if (!room) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Match room not found.' }
        }));
        break;
      }
    
      // 1. Make sure this socket really belongs in the room
      if (!room.players.some(p => tournamentManager.getPlayerId(p) === userId)) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'You are not a member of this match.' }
        }));
        break;
      }
    
      room.sockets   ??= new Map();
      room.readySet  ??= new Set();
    
      room.sockets.set(userId, ws);
      room.readySet.add(userId);
    
      //console.log(`[${matchId}] ${userId} joined (${room.readySet.size}/2)`);
    
      // 3. If both players are in, flip the switch
      if (room.readySet.size === 2) {
        room.status = 'inProgress';
    
        const payload = {
          type: 'matchStart',
          payload: {
            tournamentId,
            matchId,
            players: room.players.map(p => ({
              id:   tournamentManager.getPlayerId(p),
              name: p.name,
            })),
          },
        };
    
        // broadcast only to the two sockets inside the room
        for (const sock of room.sockets.values()) {
          if (sock.readyState === 1) {
            sock.send(JSON.stringify(payload));
          }
        }
    
        //console.log(`[${matchId}] matchStart sent`);
      }
    
      break;
    }

    case 'joinQueue': {
      const { mode } = data.payload;  
      const userId = data.payload.userId || ws.userId;
      //console.log('Incoming joinQueue request - mode:', mode);
      if (mode === 'pve') {
        createGameAI(matchManager, userId, ws);
      } else if (mode === '1v1') {
        joinQueue1v1(matchManager, userId, ws);
      }
      break;
    }
    case 'leaveQueue': {
      //console.log('Incoming leaveQueue request');
      matchManager.removeFromQueue(ws.userId);
      break;
    }
    case 'movePaddle': {
        //console.log('Incoming movePaddle request')
        //console.log('data received:', data.payload)
        //console.log('ws.userId:', ws.userId)
      
        const { direction, active } = data.payload
        const room = matchManager.rooms.get(ws.currentGameId)
        if (!room) break
        const player = room.players.find(p => p.playerId === ws.userId)
        if (!player) break
        let dy = 0
        if (active) {
          if (direction === 'up')   dy = -1
          else if (direction === 'down') dy =  1
        }
        const speed = room.paddleSpeed ?? 1.0
        const FPS = 60
        const deltaY = dy * speed / FPS
        player.paddleY = Math.max(0,
          Math.min(1, player.paddleY + deltaY)
        )
        break
      }
    case 'leaveGame':
      //console.log('Incoming leaveGame request');
      //console.log('data received:', data.payload);
      ws.inGame = false;
      ws.currentGameId = null;
      //console.log(`${ws.userId} left the game voluntarily.`);
      break;

    default:
      //console.log('Unknown message type:', data.type);
  }
}
