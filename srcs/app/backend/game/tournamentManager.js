// tournamentManager.js (refactored to work with the new SocketRegistry)
import { v4 as uuidv4 } from 'uuid';
import { MatchManager }   from './matchManager.js';

/**
 * Helper utilities ----------------------------------------------------------
 */
const WS_OPEN = 1;
const getPlayerId = p => (typeof p === 'string' ? p : p.id);
const hasUser    = (players, uid) => players.some(p => getPlayerId(p) === uid);
const removeUser = (players, uid) => players.filter(p => getPlayerId(p) !== uid);

/**
 * TournamentManager ---------------------------------------------------------
 */
export class TournamentManager {
  /**
   * @param {SocketRegistry} socketRegistry – our centralised registry
   */
  constructor(socketRegistry) {
    this.socketRegistry = socketRegistry;   // <–– NEW: single source of truth

    this.MAX_PLAYERS = 8;
    this.tournaments = {};
    this.rooms       = {};

    // You can still inject an external MatchManager if you want tighter
    // coupling, but by default we create our own.
    this.matchManager = new MatchManager();
  }

  // -------------------------------------------------------------------------
  // Convenience wrappers around the registry
  // -------------------------------------------------------------------------
  /** Send a JSON-serialisable payload to a single user */
  #sendToUser(userId, data) {
    const ws = this.socketRegistry.get(userId);
    if (ws?.readyState === WS_OPEN) ws.send(JSON.stringify(data));
  }

  /** Broadcast a message to a specific list of users */
  #broadcastToUsers(userIds, data) {
    const msg = JSON.stringify(data);
    for (const id of userIds) {
      const ws = this.socketRegistry.get(id);
      if (ws?.readyState === WS_OPEN) ws.send(msg);
    }
  }

  /** Broadcast to *everyone* currently connected */
  #broadcastAll(type, payload) {
    this.socketRegistry.broadcast(type, payload); // registry handles stringify
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  userAlreadyInTournament(userId) {
    return Object.values(this.tournaments)
      .some(t => t.host === userId || hasUser(t.players, userId));
  }

  createTournament(ws = null, userId) {
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
        name : `Player ${userId.slice(0, 4)}`,
        ready: false,
      }],
      status       : 'waiting',
      rooms        : [],
      matches      : [],
      winner       : null,
      createdAt    : Date.now(),
      pendingRound : null,
      openMatches  : null,
      roundWinners : null,
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

    const newPlayer = { id: userId, name: `Player ${userId.slice(0, 4)}`, ready: false };
    tournament.players.push(newPlayer);

    if (tournament.host === 'SERVER') tournament.host = userId;

    this.#ensureHostReady(tournament);

    // 1. Confirm to the joining client ------------------------------------------------
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

    // 2. Broadcast lobby + tournament list updates ------------------------------------
    this.broadcastTLobby(tournament);
    this.broadcastTournamentUpdate();
  }

  // -------------------------------------------------------------------------
  // Lobby & Bracket updates
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Ready-state helpers
  // -------------------------------------------------------------------------
  #ensureHostReady(tournament) {
    const hostPlayer = tournament.players.find(p => getPlayerId(p) === tournament.host);
    if (hostPlayer) hostPlayer.ready = true;
  }

  // -------------------------------------------------------------------------
  // Match handling
  // -------------------------------------------------------------------------
  startTournament(tournamentId) {
    const tourney = this.tournaments[tournamentId];
    if (!tourney) return;

    const shuffled    = [...tourney.players].sort(() => Math.random() - 0.5);
    const firstRound  = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      firstRound.push({ matchId: uuidv4(), players: [shuffled[i], shuffled[i + 1]] });
    }
    tourney.rounds = [firstRound];

    const bracketPayload = { type: 'tournamentBracket', payload: { tournamentId, rounds: tourney.rounds } };
    const recipients     = tourney.players.map(getPlayerId);
    this.#broadcastToUsers(recipients, bracketPayload);

    // Spin up the actual match rooms a few seconds later --------------------
    setTimeout(() => {
      firstRound.forEach(({ matchId, players }) => {
        const [p1, p2] = players;
        this.createMatchRoom(tournamentId, matchId, p1, p2);
      });
    }, 5000);
  }

  createMatchRoom(tournamentId, matchId, player1, player2) {
    const lobbyRoom = {
      matchId,
      tournamentId,
      players: [player1, player2],
      status : 'waiting',
    };
    this.rooms[matchId] = lobbyRoom;

    // Hand-off to MatchManager ------------------------------------------------
    this.matchManager.createRoom({ roomId: matchId, creatorId: player1.id, maxPlayers: 2 });
    this.matchManager.joinRoom(matchId, player2.id);

    // notify participants -----------------------------------------------------
    this.#notifyPlayers(lobbyRoom, tournamentId);
  }

  #notifyPlayers(room, tournamentId) {
    const payload = {
      type   : 'matchAssigned',
      payload: {
        tournamentId,
        matchId: room.matchId,
        players: room.players.map(p => ({ id: getPlayerId(p), name: p.name })),
      },
    };

    for (const player of room.players) this.#sendToUser(getPlayerId(player), payload);

    console.log(`Room created: ${room.matchId} with players ${room.players[0].id} vs ${room.players[1].id}`);
  }

  // -------------------------------------------------------------------------
  // Ready toggles, kicks, leaves
  // -------------------------------------------------------------------------
  toggleReady(userId, tournamentId) {
    const tournament = this.tournaments[tournamentId];
    if (!tournament) return console.error(`toggleReady: tournament ${tournamentId} not found`);

    const player = tournament.players.find(p => getPlayerId(p) === userId);
    if (!player) return console.error(`toggleReady: user ${userId} not in tournament ${tournamentId}`);

    player.ready = !player.ready;
    this.broadcastTLobby(tournament);
    this.broadcastTournamentUpdate();
  }

  kickPlayer(tournamentId, userId) {
    const tournament = this.tournaments[tournamentId];
    if (!tournament) return console.error(`Tournament ${tournamentId} not found`);

    tournament.players = removeUser(tournament.players, userId);
    if (tournament.host === userId) tournament.host = tournament.players[0] ? getPlayerId(tournament.players[0]) : null;

    this.broadcastTLobby(tournament);
    this.broadcastTournamentUpdate();
  }

  leaveTournament(userId, tournamentId = null) {
    const tournament = tournamentId ? this.tournaments[tournamentId] : Object.values(this.tournaments).find(t => hasUser(t.players, userId));
    if (!tournament) return console.error(`leaveTournament: user ${userId} not found`);

    tournament.players = removeUser(tournament.players, userId);
    if (tournament.host === userId && tournament.players.length) tournament.host = getPlayerId(tournament.players[0]);

    if (tournament.players.length === 0) delete this.tournaments[tournament.id];

    this.broadcastTLobby(tournament);
    this.broadcastTournamentUpdate();
  }
}
