// tournamentManager.js
import { matchManager }   from './matchManager.js';
import { v4 as uuidv4 } from 'uuid';

const getPlayerId = p => (typeof p === 'string' ? p : p.id);

const hasUser = (playerArr, userId) =>
  playerArr.some(p => getPlayerId(p) === userId);

const removeUser = (playerArr, userId) =>
  playerArr.filter(p => getPlayerId(p) !== userId);

export class TournamentManager {
  constructor() {
    this.MAX_PLAYERS = 8;
    this.requiredPlayers = 8;
    this.tournaments = {};
    this.rooms = {};
  }

  setSocketServer(wss) {
    this.wss = wss;
  }

  setUserSockets(map) {
    this.userSockets = map;
  }

  userAlreadyInTournament(userId) {
    return Object.values(this.tournaments)
      .some(t => t.host === userId || hasUser(t.players, userId));
  }

  createTournament(ws = null, userId) {
    if (userId !== 'SERVER' && this.userAlreadyInTournament(userId)) {
      if (ws?.readyState === 1) ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'You are already in a tournament' },
      }));
      return;
    }
    const id   = uuidv4();
    const code = uuidv4().slice(0,6).toUpperCase();
    const tourney = {
      id,
      code,
      host: userId,
      players: userId==='SERVER' ? [] : [{
        id:    userId,
        name:  `Player ${userId.slice(0,4)}`,
        ready: false,
      }],
      status:    'waiting',
      rooms:     [],
      matches:   [],
      winner:    null,
      createdAt: Date.now(),
      pendingRound: null,
      openMatches:  null,
      roundWinners: null,
    };
    this.tournaments[id] = tourney;
    if (ws?.readyState === 1) ws.send(JSON.stringify({
      type: 'tournamentCreated',
      payload: { id, code, slots: this.MAX_PLAYERS, hostId: userId, players: tourney.players }
    }));
    this.broadcastTournamentUpdate();
    return tourney;
  }
  
  joinTournament(userId, code, ws) {
    const tournament = Object.values(this.tournaments).find(t => t.code === code);
  
    if (!tournament) {
      console.error(`Tournament with code ${code} not found`);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Tournament not found' },
      }));
      return;
    }
    if (userId !== 'SERVER' && this.userAlreadyInTournament(userId)) {
      console.error(`User ${userId} is already in a tournament : ${tournament.id}`);
      ws?.send(JSON.stringify({
        type: 'error',
        payload: { message: 'You are already in a tournament' },
      }));
      return;
    }
    if (hasUser(tournament.players, userId)) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'You are already in this tournament' },
      }));
      return;
    }
    if (tournament.players.length >= this.MAX_PLAYERS) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Tournament is full' },
      }));
      return;
    }
    const newPlayer = {
      id:    userId,
      name:  `Player ${userId.slice(0, 4)}`,
      ready: false,
    };
    tournament.players.push(newPlayer);
    if (tournament.host === 'SERVER') {
      tournament.host = userId;
    }
    this.ensureHostReady(tournament);
  
    ws.send(JSON.stringify({
      type: 'joinedTLobby',
      payload: {
        playerId: userId,
        TLobby: {
          id:        tournament.id,
          code:      tournament.code,
          players:   tournament.players,
          hostId:    tournament.host,
          status:    tournament.status,
          createdAt: tournament.createdAt,
        }
      }
    }));
  
    this.broadcastTLobby(tournament);
    this.broadcastTournamentUpdate();
  }  

  wsSend(client, data) { 
    if (client.readyState === 1) client.send(JSON.stringify(data));
  }

  broadcastTLobby(tournament) {
    const lobbyPayload = {
      type: 'tLobbyState',
      payload: {
        id: tournament.id,
        code: tournament.code,
        hostId: tournament.host,
        slots: this.MAX_PLAYERS,
        players: tournament.players.map(p => ({
          id: getPlayerId(p),
          name: p.name,
          ready: p.ready,
        })),
      },
    };
      const playerIds = new Set(tournament.players.map(p => getPlayerId(p)));
      for (const client of this.wss.clients) {
      if (playerIds.has(client.userId)) {
        this.wsSend(client, lobbyPayload);
      }
    }
  }
  
  getPlayerId(p) {
    return typeof p === 'string' ? p : p.id;
  }

  startTournament(tournamentId) {
    const tourney = this.tournaments[tournamentId];
    if (!tourney) return;

    const shuffled = [...tourney.players].sort(() => Math.random() - 0.5);
    const firstRound = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      firstRound.push({
        matchId: uuidv4(),
        players: [shuffled[i], shuffled[i + 1]],
      });
    }
    tourney.rounds = [firstRound];

    const bracketMsg = JSON.stringify({
      type: 'tournamentBracket',
      payload: { tournamentId, rounds: tourney.rounds },
    });
    for (const [uid, ws] of this.userSockets) {
      if (ws.readyState === 1) ws.send(bracketMsg);
    }
    setTimeout(() => {
      firstRound.forEach(({ matchId, players }) => {
        const [p1, p2] = players;
        this.createMatchRoom(tournamentId, matchId, p1, p2);
      });
    }, 5000);
  }


  _createRound(tournament, playerList) {
    const players = [...playerList];
    while (players.length > 1) {
      const p1      = players.splice(Math.random()*players.length|0,1)[0];
      const p2      = players.splice(Math.random()*players.length|0,1)[0];
      const matchId = uuidv4();
      tournament.matches.push({
        matchId,
        player1: p1,
        player2: p2,
        round:   tournament.pendingRound
      });
      tournament.openMatches.add(matchId);
      this.createMatchRoom( tournament.id, matchId, p1, p2,);
    }
    if (players.length === 1) {
      tournament.roundWinners.push(players[0]);
    }
  }

  reportMatchResult(tournamentId, matchId, winner) {
    const t = this.tournaments[tournamentId];
    if (!t || !t.openMatches.has(matchId)) return;
    t.openMatches.delete(matchId);
    const winObj = typeof winner === 'string'
      ? { id: winner, name: `Player ${winner.slice(0,4)}` }
      : winner;
    t.roundWinners.push(winObj);
    if (t.openMatches.size === 0) {
      const advancers = t.roundWinners;
      t.roundWinners = [];
      t.pendingRound++;
      if (advancers.length === 1) {
        t.winner = advancers[0];
        t.status = 'finished';
        this.broadcastTournamentUpdate();
        this.broadcastTLobby(t);
      } else {
        this._createRound(t, advancers);
        this.broadcastTournamentUpdate();
      }
    }
  }

  createMatches(tournament) {
    const players = tournament.players.slice();
    while (players.length > 1) {
      const player1 = players.splice(Math.floor(Math.random() * players.length), 1)[0];
      const player2 = players.splice(Math.floor(Math.random() * players.length), 1)[0];
      const matchId = uuidv4();
      tournament.matches.push({ matchId, player1, player2 });
      this.createMatchRoom(tournament, matchId, player1, player2);
    }
    if (players.length === 1) {
      tournament.winner = players[0];
    }
    tournament.status = 'finished';
  }

  createMatchRoom(tournamentId, matchId, player1, player2) {
    const room = {
      matchId,
      tournamentId, // <-- make sure to include this
      players: [player1, player2],
      status: 'waiting',
    };
  
    this.rooms[matchId] = room;
  
    matchManager.createRoom(matchId, [player1.id, player2.id]); // <- ensure room exists
  
    this.notifyPlayers(room, tournamentId);
  }

  kickPlayer(tournamentId, userId) {
    const tournament = this.tournaments[tournamentId];
    if (!tournament) {
      console.error(`Tournament ${tournamentId} not found`);
      return;
    }
    const playerIndex = tournament.players.findIndex(p => getPlayerId(p) === userId);
    if (playerIndex === -1) {
      console.error(`Player ${userId} not found in tournament ${tournamentId}`);
      return;
    }
    tournament.players.splice(playerIndex, 1);
    if (tournament.host === userId) {
      if (tournament.players.length > 0) {
        tournament.host = getPlayerId(tournament.players[0]);
      } else {
        tournament.host = null;
      }
    }
    this.broadcastTLobby(tournament);
    this.broadcastTournamentUpdate();
  }

  leaveTournament(userId) {
    const tournament = Object.values(this.tournaments).find(t => t.players.includes(userId));

    if (!tournament) {
      throw new Error('Not in any tournament');
    }
    tournament.players = tournament.players.filter(p => p !== userId);
    if (tournament.players.length === 0) {
      delete this.tournaments[tournament.id];
    }
  }
  
  broadcastTournamentUpdate() {
    if (!this.wss) return;
  
    const list = Object.values(this.tournaments).map(t => ({
      id:       t.id,
      code:     t.code,
      name:     t.name ?? `Tournament ${t.code}`,
      slots: this.MAX_PLAYERS,
      current: t.players.length,
      displaySlots: `${t.players.length}/${this.MAX_PLAYERS}`,
      joinable: t.players.length < this.MAX_PLAYERS && t.status === 'waiting',
      hostId:   t.host,
      players:  t.players.map(p => ({
        id:    getPlayerId(p),
        name:  p.name,
        ready: p.ready
      })),
      status:   t.status,
      createdAt:t.createdAt,
    }));
    const message = JSON.stringify({
      type:    'tournamentList',
      payload: list,
    });
    for (const client of this.wss.clients) {
      if (client.readyState === 1) client.send(message);
    }
  }
  
  ensureHostReady(tournament) {
    const hostPlayer = tournament.players.find(
      p => getPlayerId(p) === tournament.host
    );
    if (hostPlayer) hostPlayer.ready = true;
  }

  notifyPlayers(room, tournamentId) {
    const payload = {
      type: 'matchAssigned',
      payload: {
        tournamentId,
        matchId: room.matchId,
        players: room.players.map(p => ({
          id: getPlayerId(p),
          name: p.name,
        })),
      },
    };
  
    for (const player of room.players) {
      const playerId = getPlayerId(player);
      const ws = this.userSockets.get(playerId);
      if (ws?.readyState === 1) {
        ws.send(JSON.stringify(payload));
      }
    }
  
    console.log(
      `Room created: ${room.matchId} with playersid ${room.players[0].id} and ${room.players[1].id}`
    );
  }
  
  

  
  toggleReady(userId, tournamentId) {
    const tournament = this.tournaments[tournamentId];

    if (!tournament) {
      console.error(`toggleReady: tournament ${tournamentId} not found`);
      return;
    }

    const player = tournament.players.find(p => getPlayerId(p) === userId);
    if (!player) {
      console.error(`toggleReady: user ${userId} not in tournament ${tournamentId}`);
      return;
    }
    player.ready = !player.ready;
    this.broadcastTLobby(tournament);
    this.broadcastTournamentUpdate();
  }

  leaveTournament(userId, tournamentId) {
    const tournament = tournamentId
      ? this.tournaments[tournamentId]
      : Object.values(this.tournaments).find(t => hasUser(t.players, userId));
  
    if (!tournament) {
      console.error(`leaveTournament: user ${userId} not found`);
      return;
    }
    tournament.players = removeUser(tournament.players, userId);
    if (tournament.host === userId && tournament.players.length > 0) {
      tournament.host = getPlayerId(tournament.players[0]);
    }
    this.broadcastTLobby(tournament);
    if (tournament.players.length === 0) {
      delete this.tournaments[tournament.id];
    }
    this.broadcastTournamentUpdate();
  }  
}

const tournamentManager = new TournamentManager();
export { tournamentManager };
