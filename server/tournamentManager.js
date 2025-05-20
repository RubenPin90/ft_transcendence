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
      // new bookkeeping fields:
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
  
    // First human becomes host
    if (tournament.host === 'SERVER') {
      tournament.host = userId;
    }
  
    // Ensure host is always marked as ready
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
        id:       tournament.id,
        code:     tournament.code,
        hostId:   tournament.host,
         slots:    this.MAX_PLAYERS,
        players:  tournament.players.map(p => ({
           id:    getPlayerId(p),
           name:  p.name,
           ready: p.ready,
         })),
       },
     };
    for (const client of this.wss.clients) this.wsSend(client, lobbyPayload);
  }
  
    
  

  startTournament(tournamentId) {
    const t = this.tournaments[tournamentId];
    if (!t) throw new Error('Tournament not found');
    if (t.status !== 'waiting')
      throw new Error('Tournament already started or finished');

    t.status        = 'in_progress';
    t.pendingRound  = 1;
    t.openMatches   = new Set();
    t.roundWinners  = [];

    // create round #1 from all current players
    this._createRound(t, t.players);
    this.broadcastTournamentUpdate();
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

      // pass tournamentId so the room can report back
      this.createMatchRoom(matchId, p1, p2, tournament.id);
    }

    // if odd, give last one an automatic bye into next round
    if (players.length === 1) {
      tournament.roundWinners.push(players[0]);
    }
  }

  reportMatchResult(tournamentId, matchId, winner) {
    const t = this.tournaments[tournamentId];
    if (!t || !t.openMatches.has(matchId)) return;

    t.openMatches.delete(matchId);
    // normalize winner object
    const winObj = typeof winner === 'string'
      ? { id: winner, name: `Player ${winner.slice(0,4)}` }
      : winner;
    t.roundWinners.push(winObj);

    // if all matches in this round are done:
    if (t.openMatches.size === 0) {
      const advancers = t.roundWinners;
      t.roundWinners = [];
      t.pendingRound++;

      if (advancers.length === 1) {
        // tournament complete
        t.winner = advancers[0];
        t.status = 'finished';
        this.broadcastTournamentUpdate();
        this.broadcastTLobby(t);
      } else {
        // kick off next round
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
      this.createMatchRoom(matchId, player1, player2);
    }

    if (players.length === 1) {
      tournament.winner = players[0];
    }

    tournament.status = 'finished';
  }

  createMatchRoom(matchId, player1, player2) {
    const room = {
      matchId,
      players: [player1, player2],
      status: 'waiting',
    };
    this.rooms[matchId] = room;
    this.notifyPlayers(room);
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
      slots: this.MAX_PLAYERS,                // number – what the code expects
      current: t.players.length,              // number – how many are inside
      displaySlots: `${t.players.length}/${this.MAX_PLAYERS}`, // for your list UI only
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
  
  /** Enforce that the current host’s `ready` flag is always true. */
  ensureHostReady(tournament) {
    const hostPlayer = tournament.players.find(
      p => getPlayerId(p) === tournament.host
    );
    if (hostPlayer) hostPlayer.ready = true;
  }


  notifyPlayers(room) {
    console.log(`Room created: ${room.matchId} with players ${room.players.join(', ')}`);
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

    const enoughPlayers = tournament.players.length >= 2 &&
                          tournament.players.length === this.requiredPlayers;
    const allReady      = tournament.players.every(p => p.ready);

    if (tournament.status === 'waiting' && enoughPlayers && allReady) {
      try {
        this.startTournament(tournamentId);
        this.broadcastTournamentUpdate();
      } catch (err) {
        console.error(`toggleReady→startTournament failed: ${err.message}`);
      }
    }
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
