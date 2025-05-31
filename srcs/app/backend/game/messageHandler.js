import WebSocket from 'ws';
import { createGameAI }          from './matchMaking.js';
import { joinQueue1v1 }          from './matchMaking.js';

const getPlayerId = p => (typeof p === 'string' ? p : p.id);

function isHost(userId, tournamentId, tournamentManager) {
  const t = tournamentManager.tournaments[tournamentId];
  return !!t && t.host === userId;
}

export function handleClientMessage(ws, rawMsg, matchManager, tournamentManager) {
  let data;
  try {
    data = JSON.parse(rawMsg);
  } catch (err) {
    console.error('Invalid JSON message from client:', err);
    return;
  }
  if (data.type != 'movePaddle')
    console.log('Received message:', data);
  switch (data.type) {

    case 'createTournament': {
      tournamentManager.createTournament(ws, ws.userId);
      break;
    }

    case 'joinByCode': {
      const { code } = data.payload;
      tournamentManager.joinTournament(ws.userId, code, ws);
      break;
    }

    case 'toggleReady': {
      const { tournamentId } = data.payload;
      tournamentManager.toggleReady(ws.userId, tournamentId);
      break;
    }

    case 'leaveTournament': {
      const { tournamentId } = data.payload ?? {};
      tournamentManager.leaveTournament(ws.userId, tournamentId);
      break;
    }


    case 'generateBracket': {
      const { tournamentId } = data.payload;
      if (isHost(ws.userId, tournamentId, tournamentManager)) {
        tournamentManager.generateBracket(tournamentId);
      }
      break;
    }

    case 'beginFirstRound': {
      const { tournamentId } = data.payload;
      if (isHost(ws.userId, tournamentId, tournamentManager)) {
        tournamentManager.beginFirstRound(tournamentId);
      }
      break;
    }


    case 'joinMatchRoom': {
      const { tournamentId, matchId } = data.payload;
      const room = tournamentManager.rooms[matchId];
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Match room not found.' }}));
        break;
      }

      if (!room.players.some(p => getPlayerId(p) === ws.userId)) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'You are not a member of this match.' }}));
        break;
      }

      room.sockets  ??= new Map();
      room.readySet ??= new Set();

      room.sockets.set(ws.userId, ws);
      room.readySet.add(ws.userId);

      if (room.readySet.size === 2) {
        room.status = 'inProgress';
        const startPayload = {
          type   : 'matchStart',
          payload: {
            tournamentId,
            matchId,
            players: room.players.map(p => ({ id: getPlayerId(p), name: p.name })),
          },
        };
        for (const sock of room.sockets.values())
          sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify(startPayload));
      }
      break;
    }

    case 'joinQueue': {
      const { mode } = data.payload;
      if (mode === 'pve')      createGameAI(matchManager, ws.userId, ws);
      else if (mode === '1v1') joinQueue1v1(matchManager, ws.userId, ws);
      break;
    }

    case 'leaveQueue': {
      matchManager.removeFromQueue(ws.userId);
      break;
    }

    case 'movePaddle': {
      const { direction, active } = data.payload;
      const room = matchManager.rooms.get(ws.currentGameId);
      if (!room) break;
      const player = room.players.find(p => p.playerId === ws.userId);
      if (!player) break;

      const dy = active ? (direction === 'up' ? -1 : direction === 'down' ? 1 : 0) : 0;
      const deltaY = dy * (room.paddleSpeed ?? 1) / 60;
      player.paddleY = Math.max(0, Math.min(1, player.paddleY + deltaY));
      break;
    }

    case 'leaveGame': {
      ws.inGame = false;
      ws.currentGameId = null;
      break;
    }

    default:
      console.log('Unknown message type:', data.type);
  }
}
