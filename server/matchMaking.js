// matchMaking.js – matchmaking helpers for ft_transcendence server
// -------------------------------------------------------------
// Exports a small set of pure functions that operate on a single
// *instance* of MatchManager, so there is no accidental shadowing
// of the exported MatchManager *class* and its static fields.
// -------------------------------------------------------------

import { GAME_MODES } from './MatchManager.js';

/**
 * Internal FIFO queue for 1‑v‑1 matchmaking.
 * Each entry is of the form: { userId: string, ws: WebSocket }
 */
const waiting1v1 = [];

/**
 * Create a PVE room (player vs AI bot) and wire up the client's socket.
 *
 * @param {MatchManager} matchManager  – the *instance* controlling rooms
 * @param {string}       userId        – the human player's id
 * @param {WebSocket}    ws            – the player's socket
 * @returns {object} The newly created room
 */
export function createGameAI(matchManager, userId, ws) {
  // 1) create a 2‑slot PVE room with the human as creator
  const room = matchManager.createRoom({
    mode:       GAME_MODES.PVE,
    maxPlayers: 2,
    creatorId:  userId,   // player added inside createRoom()
  });

  // 2) Human is already in the room (creatorId) → **do not call joinRoom()**
  //    Calling it again would see a full room (BOT + human) and emit the
  //    "room is full" warning.

  // 3) Tag the socket so later broadcasts reach it
  ws.currentGameId = room.roomId;
  ws.inGame        = true;

  // 4) Notify the client that the match is ready
  ws.send(JSON.stringify({
    type:    'matchFound',
    payload: { gameId: room.roomId, mode: 'pve' },
  }));

  return room;
}

/**
 * Join the 1‑v‑1 matchmaking queue (FIFO).
 * If another player is already waiting, immediately create a room.
 *
 * @param {MatchManager} matchManager  – the *instance* controlling rooms
 * @param {string}       userId        – this player's id
 * @param {WebSocket}    ws            – this player's socket
 * @returns {object|null} The room when a match is found, otherwise null
 */
export function joinQueue1v1(matchManager, userId, ws) {
  // Someone is already waiting → create a match
  if (waiting1v1.length > 0) {
    const other = waiting1v1.shift();

    const room = matchManager.createRoom({
      mode:       GAME_MODES.PVP,
      maxPlayers: 2,
    });

    matchManager.joinRoom(room.roomId, other.userId);
    matchManager.joinRoom(room.roomId, userId);

    // mark sockets so the server can route state updates
    [ws, other.ws].forEach(s => {
      s.inGame        = true;
      s.currentGameId = room.roomId;
    });

    // helper to DRY the notify calls
    const notify = (socket, opponentId) => socket.send(JSON.stringify({
      type:    'matchFound',
      payload: {
        gameId:     room.roomId,
        mode:       '1v1',
        opponentId,          // who you will face
      },
    }));

    notify(ws,        other.userId);
    notify(other.ws,  userId);

    return room;
  }

  // Otherwise, queue up and wait
  waiting1v1.push({ userId, ws });
  console.log(`${userId} is now waiting for a 1‑v‑1 opponent…`);
  return null;
}

/**
 * Remove a user from the 1‑v‑1 queue (e.g. on disconnect).
 *
 * @param {string} userId – id to drop
 */
export function dropFrom1v1Queue(userId) {
  const idx = waiting1v1.findIndex(entry => entry.userId === userId);
  if (idx !== -1) waiting1v1.splice(idx, 1);
}

// -------------------------------------------------------------
// Optional helpers exposed only for unit tests / debugging
// -------------------------------------------------------------

/** @internal – get a shallow copy of the waiting queue */
export function _debug_getWaitingQueue() {
  return [...waiting1v1];
}
