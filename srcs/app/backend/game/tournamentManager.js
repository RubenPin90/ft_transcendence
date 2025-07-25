import { v4 as uuidv4 } from 'uuid';
import { MatchManager }   from './matchManager.js';
import * as db from '../../database/db_matches.js';

const WS_OPEN = 1;

const getPlayerId = (p) => {
  if (p !== null && typeof p === 'object' && 'id' in p) {
    return p.id;
  }
  return String(p);
};

const hasUser    = (players, uid) => players.some(p => getPlayerId(p) === uid);
const removeUser = (players, uid) => players.filter(p => getPlayerId(p) !== uid);
const nextPow2 = n => Math.max(2, 2 ** Math.ceil(Math.log2(n)));

export class TournamentManager {
    constructor(socketRegistry, matchManager) {
      this.socketRegistry = socketRegistry;

      this.MAX_PLAYERS = 4;
      this.tournaments = {};
      this.rooms       = {};
      this.waiters = {};
      this.readyForMatch = {};
      this.matchManager = matchManager;

      this.matchManager.on('matchFinished', ({ roomId, winnerId, reason, tournamentId }) => {
      if (!tournamentId) {
        return;
      }

      const lobby = this.rooms[roomId];
      if (!lobby) return;

      const losers = lobby.players
        .filter(p => getPlayerId(p) !== winnerId)
        .map(p => getPlayerId(p));

      losers.forEach(uid => {
        this.#sendToUser(uid, {
          type: 'eliminated',
          payload: {
            tournamentId : lobby.tournamentId,
            matchId      : roomId,
            winnerId,
            reason       : 'lostMatch'
          }
        });
        const t = this.tournaments[lobby.tournamentId];
        if (t) t.eliminated.add(uid);
      });
      this.reportMatchResult(lobby.tournamentId, roomId, winnerId);
    });
  }

  playerReady(userId, tournamentId, matchId) {
    const tourney = this.tournaments[tournamentId];
    if (!tourney) {
      console.error(`playerReady: tournament ${tournamentId} not found`);
      return;
    }
    if (!Array.isArray(tourney.rounds)) {
      console.error(`playerReady: rounds for tournament ${tournamentId} not initialized`);
      return;
    }
  
    const matchInfo = tourney.rounds.flat().find(m => m.matchId === matchId);
    if (!matchInfo) {
      console.error(`playerReady: match ${matchId} not found in tournament ${tournamentId}`);
      return;
    }
    if (!this.readyForMatch[matchId]) {
      this.readyForMatch[matchId] = new Set();
    }
    this.readyForMatch[matchId].add(userId);

    if (!matchInfo) return;
    const playersIds = matchInfo.players.map(p => getPlayerId(p));

    if (playersIds.every(id => this.readyForMatch[matchId].has(id))) {
      const [p1, p2] = matchInfo.players;
      this.createMatchRoom(tournamentId, matchId, p1, p2);
      delete this.readyForMatch[matchId];
    }
  }

  waitForNextMatch(userId, tournamentId, ws) {
    if (!this.waiters[tournamentId]) {
      this.waiters[tournamentId] = new Map();
    }
    this.waiters[tournamentId].set(userId, ws);

  }

  _notifySinglePlayer(room, userId, tournamentId) {
    const tourney = this.tournaments[tournamentId];
    if (!tourney) return;

    const matchInfo = tourney.rounds
      .flat()
      .find(m => m.matchId === room.matchId);

    const payload = {
      type: 'matchAssigned',
      payload: {
        tournamentId,
        matchId: room.matchId,
        round: matchInfo?.round ?? null,
        slot:  matchInfo?.slot  ?? null,
        players: room.players.map(p => ({
          id:   getPlayerId(p),
          name: p.name,
        })),
      },
    };

    const waiterWs = this.waiters[tournamentId]?.get(userId);
    if (waiterWs?.readyState === WS_OPEN) {
      waiterWs.send(JSON.stringify(payload));
    }
  }


  #activeIds(tournament) {
    return tournament.players
      .map(getPlayerId)
      .filter(id => !tournament.eliminated.has(id));
  }
  #sendToUser(userId, data) {
    const ws = this.socketRegistry.get(userId);
    if (ws?.readyState === WS_OPEN) ws.send(JSON.stringify(data));
  }

  #broadcastToUsers(userIds, data) {
    const msg = JSON.stringify(data);
    for (const id of userIds) {
      const ws = this.socketRegistry.get(id);
      if (ws?.readyState === WS_OPEN) ws.send(msg);
    }
  }

  #broadcastAll(type, payload) {
    this.socketRegistry.broadcast(type, payload);
  }

  userAlreadyInTournament(userId) {
    return Object.values(this.tournaments)
      .some(t => t.host === userId || hasUser(t.players, userId));
  }

  

  async createTournament(ws = null, userId) {
    if (userId !== 'SERVER' && this.userAlreadyInTournament(userId)) {
      ws?.readyState === WS_OPEN && ws.send(JSON.stringify({
        type   : 'error',
        payload: { message: 'You are already in a tournament' },
      }));
      return;
    }
 
    const id   = uuidv4();
    const code = uuidv4().slice(0, 6).toUpperCase();

    const tourney = {
      id,
      code,
      host   : userId,
      players: userId === 'SERVER' ? [] : [{
        id   : userId,
        name : ws.username,
        ready: true,
      }],
      status       : 'waiting',
      rooms        : [],
      matches      : [],
      winner       : null,
      createdAt    : Date.now(),
      pendingRound : null,
      openMatches  : null,
      roundWinners : null,
      eliminated   : new Set(),
    };

    this.tournaments[id] = tourney;

    ws?.readyState === WS_OPEN && ws.send(JSON.stringify({
      type   : 'tournamentCreated',
      payload: {
        id,
        code,
        slots  : this.MAX_PLAYERS,
        hostId : userId,
        players: tourney.players,
      },
    }));

    this.broadcastTournamentUpdate();
    return tourney;
  }

  joinTournament(userId, code, ws) {
    const tournament = Object.values(this.tournaments).find(t => t.code === code);

    if (!tournament) {
      ws?.send(JSON.stringify({
        type   : 'error',
        payload: { message: 'Tournament not found' },
      }));
      return;
    }

    if (userId !== 'SERVER' && this.userAlreadyInTournament(userId)) {
      ws?.send(JSON.stringify({
        type   : 'error',
        payload: { message: 'You are already in a tournament' },
      }));
      return;
    }

    if (hasUser(tournament.players, userId)) {
      ws?.send(JSON.stringify({
        type   : 'error',
        payload: { message: 'You are already in this tournament' },
      }));
      return;
    }

    if (tournament.players.length >= this.MAX_PLAYERS) {
      ws?.send(JSON.stringify({
        type   : 'error',
        payload: { message: 'Tournament is full' },
      }));
    return;
    }
    const uid = getPlayerId(userId);
    const newPlayer = {
      id: String(userId),
      name: ws.username,
      ready: false,
    };
    tournament.players.push(newPlayer);

    if (tournament.host === 'SERVER') tournament.host = userId;

    this.#ensureHostReady(tournament);

    this.#sendToUser(userId, {
      type   : 'joinedTLobby',
      payload: {
        playerId: userId,
        TLobby  : {
          id      : tournament.id,
          code    : tournament.code,
          players : tournament.players,
          hostId  : tournament.host,
          status  : tournament.status,
          createdAt: tournament.createdAt,
        },
      },
    });
    this.broadcastTLobby(tournament);
    this.broadcastTournamentUpdate();
  }

  broadcastTLobby(tournament) {
    const lobbyPayload = {
      type   : 'tLobbyState',
      payload: {
        id     : tournament.id,
        code   : tournament.code,
        hostId : tournament.host,
        slots  : this.MAX_PLAYERS,
        players: tournament.players.map(p => ({
          id   : getPlayerId(p),
          name : p.name,
          ready: p.ready,
        })),
      },
    };

    const playerIds = tournament.players.map(getPlayerId);
    this.#broadcastToUsers(playerIds, lobbyPayload);
  }

  async reportMatchResult (tournamentId, matchId, winnerId) {
    const tourney = this.tournaments[tournamentId];
    if (!tourney) return;
  
    let roundIdx = -1;
    let matchObj = null;
  
    for (let i = 0; i < tourney.rounds.length; i++) {
      matchObj = tourney.rounds[i].find(m => m.matchId === matchId);
      if (matchObj) { roundIdx = i; break; }
    }
    if (!matchObj) return;
  
    matchObj.winner = winnerId;
  
    try {
      await db.update_match('winner', winnerId, matchId);
    } catch (err) {
      console.error('DB-update failed:', err);
    }
  
    if (roundIdx + 1 >= tourney.rounds.length) {
      tourney.winner = winnerId;
      this.#broadcastToUsers(
        this.#activeIds(tourney),
        {
          type   : 'tournamentFinished',
          payload: { tournamentId, winnerId }
        }
      );
      this.leaveTournament(winnerId, tournamentId);
      delete this.tournaments[tournamentId];
      return;
    }
  
    const nextRound   = tourney.rounds[roundIdx + 1];
    const placeholder = nextRound.find(m =>
      m.players.some(p => p && p.pendingMatchId === matchId)
    );
    if (!placeholder) return;
  
    const winnerName =
      tourney.players.find(p => getPlayerId(p) === winnerId)?.name ??
      this.rooms[matchId]?.players.find(p => getPlayerId(p) === winnerId)?.name ??
      `Player ${winnerId.slice(0, 4)}`;
  
    placeholder.players = placeholder.players.map(p =>
      (p && p.pendingMatchId === matchId)
        ? { id: winnerId, name: winnerName }
        : p
    );
  
    this.#broadcastToUsers(
      this.#activeIds(tourney),
      {
        type   : 'tournamentBracketMsg',
        payload: { tournamentId, rounds: tourney.rounds }
      }
    );
  
    const [p1, p2] = placeholder.players;
  
    const nextRoundFilled =
      roundIdx + 1 < tourney.rounds.length &&
      tourney.rounds[roundIdx + 1].every(m =>
        m.players.filter(p => p && !('pendingMatchId' in p)).length === 2
      );
  
    if (nextRoundFilled) {
      this.beginRound(tournamentId, roundIdx + 1);
    }
  }
  
  
  broadcastTournamentUpdate() {
    const list = Object.values(this.tournaments).map(t => ({
      id         : t.id,
      code       : t.code,
      name       : t.name ?? `Tournament ${t.code}`,
      slots      : this.MAX_PLAYERS,
      current    : t.players.length,
      displaySlots: `${t.players.length}/${this.MAX_PLAYERS}`,
      joinable   : t.players.length < this.MAX_PLAYERS && t.status === 'waiting',
      hostId     : t.host,
      players    : t.players.map(p => ({
        id   : getPlayerId(p),
        name : p.name,
        ready: p.ready,
      })),
      status    : t.status,
      createdAt : t.createdAt,
    }));

    this.#broadcastAll('tournamentList', list);
  }

  #ensureHostReady(tournament) {
    const hostPlayer = tournament.players.find(p => getPlayerId(p) === tournament.host);
    if (hostPlayer) hostPlayer.ready = true;
  }
  

  generateBracket(tournamentId) {
    const tourney = this.tournaments[tournamentId];
    if (!tourney) return;

    const buildBracket = players => {
      const size     = nextPow2(players.length);
      const byes     = size - players.length;
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      for (let i = 0; i < byes; i++) shuffled.push(null);

      const rounds = [];
      let current  = shuffled;
      let roundNo  = 0;

      while (current.length > 1) {
        const thisRound = [];
        const nextQueue = [];

        for (let i = 0; i < current.length; i += 2) {
          const p1 = current[i];
          const p2 = current[i + 1];
          const id = uuidv4();
          const slot = i / 2;

          thisRound.push({
            matchId: id,
            round: roundNo,
            slot,
            players: [p1, p2],
          });

          if (p1 && !p2)      nextQueue.push(p1);
          else if (!p1 && p2) nextQueue.push(p2);
          else                nextQueue.push({ pendingMatchId: id });
        }

        rounds.push(thisRound);
        current = nextQueue;
        roundNo++;
      }
      return rounds;
    };

    tourney.rounds = buildBracket(tourney.players);
    tourney.status = 'bracket';
  
    this.#broadcastToUsers(
      this.#activeIds(tourney),
      {
        type   : 'tournamentBracketMsg',
        payload: { tournamentId, rounds: tourney.rounds }
      }
    );
  }

  beginRound(tournamentId, roundIdx = 0) {
    const t = this.tournaments[tournamentId];
    if (!t || !t.rounds?.[roundIdx]) return;
    if (!t || t.status === 'running') return;
    t.status = 'running';
    t.rounds[roundIdx].forEach(({ matchId, players }) => {
      const [p1, p2] = players;
      this.createMatchRoom(tournamentId, matchId, p1, p2 ?? null);
    });
  }

  createMatchRoom(tournamentId, matchId, player1, player2) {
    if (this.rooms[matchId]) return;  
    if (!player2) {
      this.matchManager.reportResult?.(tournamentId, matchId, getPlayerId(player1));
      return;
    }
  
    const lobbyRoom = {
      matchId,
      tournamentId,
      players: [player1, player2],
      status : 'waiting',
    };
    this.rooms[matchId] = lobbyRoom;
  
    const creatorId  = getPlayerId(player1);
    const opponentId = getPlayerId(player2);
    this.matchManager.createRoom({
      roomId    : matchId,
      creatorId : creatorId,
      maxPlayers: 2,
      tournamentId: tournamentId
    });
  
     this.#notifyPlayers(lobbyRoom, tournamentId);

     const waitMap = this.waiters[tournamentId];
     if (waitMap) {
       for (const p of [player1, player2]) {
         const uid = getPlayerId(p);
         if (waitMap.has(uid)) {
           this._notifySinglePlayer(lobbyRoom, uid, tournamentId);
           waitMap.delete(uid);
         }
       }
     }
  }
  
  
  #notifyPlayers(room, tournamentId) {
    const tourney = this.tournaments[tournamentId];
    const match = tourney.rounds?.flat().find(m => m.matchId === room.matchId);
  
    const payload = {
      type: 'matchAssigned',
      payload: {
        tournamentId,
        matchId: room.matchId,
        round: match?.round ?? null,
        slot: match?.slot ?? null,
        players: room.players.map(p => ({
          id: getPlayerId(p),
          name: p.name,
        })),
      },
    };
    
    for (const player of room.players)
      this.#sendToUser(getPlayerId(player), payload);
  }


  toggleReady(userId, tournamentId) {
    const tournament = this.tournaments[tournamentId];
    if (!tournament) return console.error(`toggleReady: tournament ${tournamentId} not found`);

    const player = tournament.players.find(p => getPlayerId(p) == userId);
    if (!player) return console.error(`toggleReady: user ${userId} not in tournament ${tournamentId}`);
    player.ready = !player.ready;
    this.broadcastTLobby(tournament);
    this.broadcastTournamentUpdate();
  }

  leaveTournament(userId, tournamentId = null) {
    const tournament = tournamentId
    ? this.tournaments[tournamentId]
      : Object.values(this.tournaments).find(t => hasUser(t.players, userId));
  
    if (!tournament) {
      return;
    }
  
    if (tournament.status !== 'waiting' && Array.isArray(tournament.rounds)) {
      tournament.eliminated.add(userId);
  
      for (const round of tournament.rounds) {
        for (const match of round) {
          const ids = match.players.map(p => getPlayerId(p));
          const idx = ids.indexOf(userId);
          if (idx !== -1 && !match.winner) {
            const opponent = match.players[1 - idx];
            const matchId  = match.matchId;
            if (opponent) {
              this.reportMatchResult(
                tournament.id,
                matchId,
                getPlayerId(opponent)
              );
            }
            this.matchManager.leaveRoom(matchId, userId);
            break;
          }
        }
      }
    }
    tournament.players = removeUser(tournament.players, userId);  
    if (tournament.host === userId && tournament.players.length > 0) {
      tournament.host = getPlayerId(tournament.players[0]);
    }
    if (tournament.players.length === 0) {
      delete this.tournaments[tournament.id];
      return;
    }
    if (tournament.status === 'waiting') {
      this.broadcastTLobby(tournament);
      this.broadcastTournamentUpdate();
    }
  }
}
