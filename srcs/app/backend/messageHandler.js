// server/messageHandler.js
import WebSocket from 'ws';
import { createGameAI } from './matchMaking.js';
import { joinQueue1v1, joinQueueTournament } from './matchMaking.js';
import { matchManager } from './matchManager.js';
import { tournamentManager } from './tournamentManager.js';



/**
 * Handle any incoming JSON message from a ws-like object.
 * @param {{ userId, inGame, currentGameId, send, readyState }} ws
 * @param {string} rawMsg
 * @param {WebSocket.Server} wss   // only needed if you want to broadcast chat
 */
export function handleClientMessage(ws, rawMsg, matchManager) {
  let data;
  try {
    data = JSON.parse(rawMsg);
  } catch (err) {
    console.error('Invalid JSON message from client:', err);
    return;
  }
  // console.log(`Incoming from ${ws.userId}:`);
  // console.log(data);
  switch (data.type) {
    case 'chat':
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'chat',
            payload: data.payload,
          }));
        }
      });
      break;
    case 'joinByCode': {
        console.log('Incoming joinByCode request with data:', data);
        const { code } = data.payload;
        const userId = ws.userId;
        tournamentManager.joinTournament(userId, code, ws);
        break;
      }
    case 'createTournament': {
      console.log('Incoming createTournament request with data:', data);
      const tournamentId = tournamentManager.createTournament(ws, ws.userId);
      ws.send(JSON.stringify({
        type:  'tournamentCreated',
        payload: tournamentId,
      }));
      break;
    
    }
    case 'toggleReady':{
      console.log('Incoming toggleReady request with data:', data);
      const { tournamentId } = data.payload;
      const userId = ws.userId;
      tournamentManager.toggleReady(userId, tournamentId);
      break;
    }

    case 'leaveTournament': {
      console.log('Incoming leaveTournament request with data:', data);
      const { tournamentId } = data.payload ?? {};
      const userId = ws.userId;
      tournamentManager.leaveTournament(userId, tournamentId);
      break;
    }

    case 'joinQueue': {
      const { mode } = data.payload;  
      const userId = data.payload.userId || ws.userId;
      console.log('Incoming joinQueue request - mode:', mode);
      if (mode === 'pve') {
        createGameAI(matchManager, userId, ws);
      } else if (mode === '1v1') {
        joinQueue1v1(matchManager, userId, ws);
      }
      break;
    }
    case 'leaveQueue': {
      console.log('Incoming leaveQueue request');
      // remove this ws.userId from whatever queue you pushed them into
      matchManager.removeFromQueue(ws.userId);
      break;
    }
    case 'movePaddle': {
        console.log('Incoming movePaddle request')
        console.log('data received:', data.payload)
        console.log('ws.userId:', ws.userId)
      
        // 1) pull out direction & active
        const { direction, active } = data.payload
      
        // 2) lookup the game room
        const room = matchManager.rooms.get(ws.currentGameId)
        if (!room) break
      
        // 3) find this player
        const player = room.players.find(p => p.playerId === ws.userId)
        if (!player) break
        // 4) compute dy: up = -1, down = +1, else 0
        let dy = 0
        if (active) {
          if (direction === 'up')   dy = -1
          else if (direction === 'down') dy =  1
        }
        
        // 5) apply movement
        const speed = room.paddleSpeed ?? 1.0      // you can tweak this
        const FPS = 60                     // same value you use in _mainLoop
        const deltaY = dy * speed / FPS
        player.paddleY = Math.max(0,
          Math.min(1, player.paddleY + deltaY)
        )
        break
      }
    case 'leaveGame':
      ws.inGame = false;
      ws.currentGameId = null;
      console.log(`${ws.userId} left the game voluntarily.`);
      break;

    default:
      console.log('Unknown message type:', data.type);
  }
}
