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
    return Object.values(this.tournaments).some(t => t.host === userId || hasUser(t.players, userId));
  }


  createTournament(ws = null, userId) {
    if (userId !== 'SERVER' && this.userAlreadyInTournament(userId)) {
      if (ws?.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'You are already in a tournament' },
        }));
      }
      return;
    }
  
    const tournamentId = uuidv4();
    const code        = uuidv4().slice(0, 6).toUpperCase();
  
    const tournament = {
      id:        tournamentId,
      code:      code,
      players:   userId === 'SERVER'
                 ? []
                 : [{
                     id:    userId,
                     name:  `Player ${userId.slice(0, 4)}`,
                     ready: false,
                   }],
      host:      userId,
      status:    'waiting',
      rooms:     [],
      matches:   [],
      winner:    null,
      createdAt: Date.now(),
    };
  
    this.tournaments[tournamentId] = tournament;
  
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'tournamentCreated',
        payload: {
          id:      tournament.id,
          code:    tournament.code,
          slots:   this.MAX_PLAYERS,
          hostId:  tournament.host,
          players: tournament.players,
        },
      }));
    }
    this.broadcastTournamentUpdate();
  
    return tournament;
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

    if (tournament.players.includes(userId)) {
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

    tournament.players.push({
         id:    userId,
         name:  `Player ${userId.slice(0, 4)}`,
         ready: false,
       });

    if (tournament.host === 'SERVER') {
        tournament.host = userId;
    }

    ws.send(JSON.stringify({
      type: 'joinedTLobby',
      payload: {
        playerId: userId,
        TLobby: {
          id:       tournament.id,
          code:     tournament.code,
          players:  tournament.players,
          hostId:   tournament.host,
          status:   tournament.status,
          createdAt:tournament.createdAt
        }
      }
    }));
    
    this.broadcastTournamentUpdate();
  }

  startTournament(tournamentId) {
    const tournament = this.tournaments[tournamentId];

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'waiting') {
      throw new Error('Tournament already started or finished');
    }

    tournament.status = 'in_progress';
    this.createMatches(tournament);
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
  
    const message = JSON.stringify({
      type: 'tournamentList',
      payload: Object.values(this.tournaments).map(t => ({
        id:       t.id,
        code:     t.code,
        name:     t.name ?? `Tournament ${t.code}`,
        slots:    `${t.players.length}/${this.MAX_PLAYERS}`,
        joinable: t.players.length < this.MAX_PLAYERS && t.status === 'waiting',
        hostId:   t.host,
        players:  t.players,
        status:   t.status,
        createdAt:t.createdAt,
      })),
    });
  
    for (const client of this.wss.clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  }

  notifyPlayers(room) {
    // зtodo btw
    console.log(`Room created: ${room.matchId} with players ${room.players.join(', ')}`);
  }
  toggleReady(userId, tournamentId) {
    const tournament = this.tournaments[tournamentId];

    // ── basic guards ────────────────────────────────────────────────────────────
    if (!tournament) {
      console.error(`toggleReady: tournament ${tournamentId} not found`);
      return;
    }

    const player = tournament.players.find(p => getPlayerId(p) === userId);
    if (!player) {
      console.error(`toggleReady: user ${userId} not in tournament ${tournamentId}`);
      return;
    }

    // ── flip flag ───────────────────────────────────────────────────────────────
    player.ready = !player.ready;

    // ── let everyone in every lobby know the roster changed ────────────────────
    this.broadcastTournamentUpdate();

    // ── auto‑start if every slot is filled & all are ready ─────────────────────
    const enoughPlayers = tournament.players.length >= 2 &&
                          tournament.players.length === this.requiredPlayers;
    const allReady      = tournament.players.every(p => p.ready);

    if (tournament.status === 'waiting' && enoughPlayers && allReady) {
      try {
        this.startTournament(tournamentId);
        this.broadcastTournamentUpdate();   // push new “in_progress” status
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
      tournament.host = getPlayerId(tournament.players[0]);   // promote first
    }
  
    if (tournament.players.length === 0) {
      delete this.tournaments[tournament.id];
    }
  
    this.broadcastTournamentUpdate();
  }  
}

const tournamentManager = new TournamentManager();
export { tournamentManager };
