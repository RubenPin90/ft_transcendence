import { GAME_MODES } from './matchManager.js';
import { v4 as uuidv4 } from 'uuid'




export function createGameAI(matchManager, userId, ws) {
  const botId = `bot_${uuidv4()}`;
  const room  = matchManager.createRoom({
    mode:       GAME_MODES.PVE,
    maxPlayers: 2,
    creatorId:  userId,
    botId,
  });

  
  ws.userId        = userId;
  ws.currentGameId = room.roomId;
  ws.inGame        = true;
  matchManager.registerSocket(userId, ws);

  ws.send(JSON.stringify({
    type:    'matchFound',
    payload: { gameId: room.roomId, mode:'pve', userId }
  }));
  return room;
}

export function joinQueueTournament(userId, ws) {
  const REQUIRED_PLAYERS = 4

  waitingTournamentPlayers.push({ userId, ws })

  if (waitingTournamentPlayers.length >= REQUIRED_PLAYERS) {
    const group = waitingTournamentPlayers.splice(0, REQUIRED_PLAYERS)

    const room = matchManager.createRoom({
      mode: GAME_MODES.CUSTOM,
      maxPlayers: REQUIRED_PLAYERS,
    })

    group.forEach((player) => {
      matchManager.joinRoom(room.roomId, player.userId)
      player.ws.inGame = true
      player.ws.currentGameId = room.roomId
    })

    group.forEach((player) => {
      player.ws.send(JSON.stringify({
        type: 'matchFound',
        payload: {
          gameId: room.roomId,
          mode: 'Tournament',
          players: group.map((g) => g.userId),
        },
      }))
    })
    //console.log(`Tournament started with ${REQUIRED_PLAYERS} players (roomId = ${room.roomId})`)
  }
}

export function joinQueue1v1(matchManager, userId, ws) {
  const queue = matchManager.queues[GAME_MODES.PVP];

  if (queue.some(e => e.userId === userId)) return null;

  if (queue.length > 0) {
    const rival = queue.shift();

    const room = matchManager.createRoom({
      mode:       GAME_MODES.PVP,
      maxPlayers: 2,
    });

    matchManager.joinRoom(room.roomId, rival.userId);
    matchManager.joinRoom(room.roomId, userId);

    [ws, rival.ws].forEach(s => {
      s.inGame        = true;
      s.currentGameId = room.roomId;
    });
    //console.log(`1v1 game started (roomId = ${room.roomId})`);
    //console.log(`Players: ${userId} vs ${rival.userId}`);
    const notify = (sock, selfId, oppId) =>
      sock.send(JSON.stringify({
        type: 'matchFound',
        payload: { gameId: room.roomId, mode: '1v1', userId: selfId, opponentId: oppId }
      }));

    notify(ws,        userId,     rival.userId);
    notify(rival.ws,  rival.userId, userId);

    return room;
  }

  queue.push({ userId, ws });
  //console.log(`${userId} is now waiting for a 1‑v‑1 opponent…`);
  return null;
}


export const dropFrom1v1Queue = (mgr, uid) => mgr.removeFromQueue(uid);

export function _debug_getWaitingQueue() {
  return [...waiting1v1];
}
