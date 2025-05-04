// tournamentManager.js
import { matchManager }   from './matchManager.js';   // <-- your existing singleton/export


import { v4 as uuidv4 } from 'uuid';

export class TournamentManager {
  constructor() {
    this.MAX_PLAYERS = 8;
    this.requiredPlayers = 8;
    this.tournaments = {};
    this.rooms = {};
  }

  createTournament(ws) {
    const tournamentId = uuidv4();
    const code = uuidv4().slice(0, 6).toUpperCase();
    const tournament = {
      id: tournamentId,
      code: code,
      players: [],
      status: 'waiting', // 'waiting', 'in_progress', 'finished'
      rooms: [],
      matches: [],
      winner: null,
      createdAt: Date.now(),
    };
    this.tournaments[tournamentId] = tournament;

    ws.send(JSON.stringify({
      type: 'tournamentCreated',
      payload: { tournamentId, code },
    }));

    return tournamentId;
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

    if (tournament.players.length >= this.MAX_PLAYERS) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Tournament is full' },
      }));
      return;
    }

    tournament.players.push(userId);

    ws.send(JSON.stringify({
      type: 'joinedTournament',
      payload: { tournamentId: tournament.id, players: tournament.players },
    }));
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
    this.notifyPlayers(room); // Реализуйте это отдельно
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

  notifyPlayers(room) {
    // заглушка — реализуй сам логику оповещения, если нужно
    console.log(`Room created: ${room.matchId} with players ${room.players.join(', ')}`);
  }
}

const tournamentManager = new TournamentManager();
export { tournamentManager };
