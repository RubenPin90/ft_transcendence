// matchMaking.js – matchmaking helpers for ft_transcendence server
// -------------------------------------------------------------
// Exports a small set of pure functions that operate on a single
// *instance* of MatchManager, so there is no accidental shadowing
// of the exported MatchManager *class* and its static fields.
// -------------------------------------------------------------

import { GAME_MODES } from './MatchManager.js';

const waiting1v1 = [];

export function createGameAI(matchManager, userId, ws) {

  const room = matchManager.createRoom({
    mode:       GAME_MODES.PVE,
    maxPlayers: 2,
    creatorId:  userId,   
  });
  ws.currentGameId = room.roomId;
  ws.inGame        = true;

  matchManager.registerSocket(userId, ws);

  ws.send(JSON.stringify({
    type:    'matchFound',
    payload: { gameId: room.roomId, mode: 'pve' },
  }));

  return room;
}


export function joinQueue1v1(matchManager, userId, ws) {
  if (waiting1v1.length > 0) {
    const other = waiting1v1.shift();

    const room = matchManager.createRoom({
      mode:       GAME_MODES.PVP,
      maxPlayers: 2,
    });

    matchManager.joinRoom(room.roomId, other.userId);
    matchManager.joinRoom(room.roomId, userId);

    [ws, other.ws].forEach(s => {
      s.inGame        = true;
      s.currentGameId = room.roomId;
    });

    const notify = (socket, opponentId) => socket.send(JSON.stringify({
      type:    'matchFound',
      payload: {
        gameId:     room.roomId,
        mode:       '1v1',
        opponentId,         
      },
    }));

    notify(ws,        other.userId);
    notify(other.ws,  userId);

    return room;
  }

  waiting1v1.push({ userId, ws });
  console.log(`${userId} is now waiting for a 1‑v‑1 opponent…`);
  return null;
}


export function dropFrom1v1Queue(userId) {
  const idx = waiting1v1.findIndex(entry => entry.userId === userId);
  if (idx !== -1) waiting1v1.splice(idx, 1);
}


export function _debug_getWaitingQueue() {
  return [...waiting1v1];
}
