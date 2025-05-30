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
const nextPow2 = n => Math.max(2, 2 ** Math.ceil(Math.log2(n)));

/**
 * TournamentManager ---------------------------------------------------------
 */
export class TournamentManager {
  /**
   * @param {SocketRegistry} socketRegistry – our centralised registry
   */
  constructor(socketRegistry, matchManager) {
    this.socketRegistry = socketRegistry;

    this.MAX_PLAYERS = 4;
    this.tournaments = {};
    this.rooms       = {};

    // Use the shared instance – don’t create a new one
    this.matchManager = matchManager;

    // Now the event really comes from this instance
    this.matchManager.on('matchFinished', ({ roomId, winnerId }) => {
      console.log('matchFinished event received:', { roomId, winnerId });
      const lobby = this.rooms[roomId];
      if (!lobby) return;
      this.reportMatchResult(
        lobby.tournamentId,
        roomId,
        winnerId
      );
    });
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

  reportMatchResult(tournamentId, matchId, winnerId) {
    const tourney = this.tournaments[tournamentId];
    if (!tourney) return;
  
    // ------------------------------------------------------------------
    // 1.  Locate the finished match and the round it belongs to
    // ------------------------------------------------------------------
    let roundIdx = -1;
    let matchObj = null;
  
    for (let i = 0; i < tourney.rounds.length; i++) {
      matchObj = tourney.rounds[i].find(m => m.matchId === matchId);
      if (matchObj) { roundIdx = i; break; }
    }
    if (!matchObj) return;
  
    matchObj.winner = winnerId;
  
    // ------------------------------------------------------------------
    // 2.  Is there a next round?  If not, we have a champion.
    // ------------------------------------------------------------------
    if (roundIdx + 1 >= tourney.rounds.length) {
      tourney.winner = winnerId;
      this.#broadcastAll('tournamentFinished', { tournamentId, winnerId });
      return;
    }
  
    // ------------------------------------------------------------------
    // 3.  Drop the winner into the correct placeholder of the next round
    // ------------------------------------------------------------------
    const nextRound = tourney.rounds[roundIdx + 1];
    const placeholder = nextRound.find(m =>
      m.players.some(p => p && p.pendingMatchId === matchId));
  
    if (!placeholder) return;               // sanity check
  
    // Replace the placeholder object with a real player stub
    placeholder.players = placeholder.players.map(p =>
      (p && p.pendingMatchId === matchId)
        ? { id: winnerId, name: `Player ${winnerId.slice(0,4)}` }
        : p
    );
  
    // ------------------------------------------------------------------
    // 4.  If both seats are now real players, create the room
    // ------------------------------------------------------------------
    const [p1, p2] = placeholder.players;
    if (p1 && !p1.pendingMatchId && p2 && !p2.pendingMatchId) {
      this.createMatchRoom(tournamentId, placeholder.matchId, p1, p2);
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
  // 1. Called when the host clicks “Start tournament” — just shows the bracket
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
      tourney.players.map(getPlayerId),
      {
        type   : 'tournamentBracketMsg',
        payload: { tournamentId, rounds: tourney.rounds }
      }
    );
  
    /* ---------- NEW:  automatic 5-second countdown ------------ */
    setTimeout(() => {
      // start only if nobody has cancelled / deleted the tourney in the meantime
      if (this.tournaments[tournamentId]?.status === 'bracket') {
        this.beginFirstRound(tournamentId);
      }
    }, 5000);  
  }

  beginFirstRound(tournamentId) {
    const tourney = this.tournaments[tournamentId];
    if (!tourney?.rounds?.length || tourney.status !== 'bracket') return;
  
    tourney.status = 'running';
  
    tourney.rounds[0].forEach(({ matchId, players }) => {
      const [p1, p2] = players;
      this.createMatchRoom(tournamentId, matchId, p1, p2 ?? null);
    });
  }

  
  

  createMatchRoom(tournamentId, matchId, player1, player2) {
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
  
    // ------------------------------------------------------------------
    // 1.  Build the room and pre-seat the creator
    // ------------------------------------------------------------------
    const creatorId  = getPlayerId(player1);   // <-- NEW
    const opponentId = getPlayerId(player2);   // <-- NEW
  
    this.matchManager.createRoom({
      roomId    : matchId,
      creatorId : creatorId,
      maxPlayers: 2,
    });
  
    // 2.  Seat ONLY the opponent (creator is already inside)
    this.matchManager.joinRoom(matchId, opponentId);
  
     // 3.  Notify the participants
     this.#notifyPlayers(lobbyRoom, tournamentId);
  }
  
  
  #notifyPlayers(room, tournamentId) {
    // Look up round and slot info
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
