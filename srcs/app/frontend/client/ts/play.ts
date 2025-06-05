import {
  initGameCanvas,
  startGame,
  stopGame,
  setOnGameEnd,
  GameMode,
  drawFrame,
  setupInputHandlers
} from './game.js';
import {
  renderTournamentList,
  joinByCode,
  renderTLobby,
  renderBracketOverlay
} from './tournament.js';
import { setupButtonsDelegated } from './buttons.js';
import type {
  TLobbyState,
  MatchStub,
  BracketRounds,
  TournamentBracketMsg,
  TourneySummary,
  TournamentBracketPayload,
  PlayerStub
} from './types.js';
import { setMyId, setCurrentTLobby, getCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
import { setupMatchmakingHandlers } from './matchmaking.js';
import { on, send, getSocket } from './socket.js';
import { where_am_i, toggle_divs } from './redirect.js';

/*
 * ────────────────────────────────────────────────────────────
 *  Module‑level state
 * ────────────────────────────────────────────────────────────
 */
let currentRoomId: string | null       = null;
let currentMatch: string | null        = null;
let teardownInput: (() => void) | null = null;

let currentTournamentId: string | null = null;  // <‑‑ remember active tournament
let isFirstRound                       = true;  // <‑‑ flag to auto‑start only round 1

/*
 * ────────────────────────────────────────────────────────────
 *  1.  Guarantee we have a socket right away and recover userId
 * ────────────────────────────────────────────────────────────
 */

console.log('[play.ts] Initializing play module...');

on('welcome', (msg) => {
  const id   = msg.payload.userId;
  localStorage.setItem('playerId', id);

  const sock = getSocket();
  (sock as any).userId = id;
});

on('error', (msg) => {
  const banner          = document.getElementById('error-banner')!;
  banner.textContent    = msg.payload.message;
  banner.style.display  = 'block';
});

/*
 * ────────────────────────────────────────────────────────────
 *  2.  TLobby and tournament events – unchanged API except for
 *      new round‑start flow
 * ────────────────────────────────────────────────────────────
 */

on('joinedTLobby', (msg) => {
  const { playerId, TLobby } = msg.payload;
  setMyId(playerId);
  localStorage.setItem('playerId', playerId);
  if (TLobby) {
    setCurrentTLobby(TLobby);
    history.pushState({}, '', `/tournament/${TLobby.code}`);
    renderTLobby(TLobby, getSocket());
  }
});

on<'matchAssigned'>('matchAssigned', (msg) => {
  const { tournamentId, matchId, players } = msg.payload;
  const myId         = localStorage.getItem('playerId') ?? (getSocket() as any).userId;
  const me           = players.find(p => p.id === myId);
  const rival        = players.find(p => p.id !== myId);
  if (!me || !rival) return;

  console.log('[matchAssigned] navigating to game:', matchId, players);
  localStorage.setItem('currentGameId', matchId);
  currentRoomId        = matchId;
  currentTournamentId  = tournamentId;   // remember for later beginRound

  setTimeout(() => {
    send({ type: 'joinMatchRoom', payload: { tournamentId, matchId } });
    showGameContainerAndStart();
  }, 3000);
});

on<'tournamentBracketMsg'>('tournamentBracketMsg', async (msg) => {
  /*
   * After *every* round the server broadcasts the updated bracket. We now start
   * *only* the very first round automatically. For later rounds we wait for
   * each match winner to acknowledge the alert and then – if they actually
   * *won* – fire a beginRound after a 2 s grace period.
   */
  const { tournamentId, rounds } = msg.payload as {
    tournamentId: string;
    rounds: MatchStub[][] | MatchStub[];
  };

  // Store for later beginRound use in setOnGameEnd
  currentTournamentId = tournamentId;

  /* Bracket overlay rendering – unchanged */
  const normalized: MatchStub[][] = Array.isArray(rounds[0])
    ? rounds as MatchStub[][]
    : [rounds as MatchStub[]];

  if (!Array.isArray(rounds[0])) {
    location.href = '/tournament/round2';
  }
  renderBracketOverlay(normalized);

  await new Promise(r => setTimeout(r, 700));

  const firstRound = normalized[0];
  const firstReal  = firstRound.find(
    m => m.players.filter(p => p && !('pendingMatchId' in p)).length === 2
  );

  if (firstReal) {
    const [A, B] = firstReal.players as PlayerStub[];
    await showVersusOverlay(A.name, B.name);
  }

  /*
   * Only auto‑start the *very first* round. Later rounds are started from
   * setOnGameEnd once winners acknowledge.
   */
  if (isFirstRound) {
    send({ type: 'beginRound', payload: { tournamentId } });
    isFirstRound = false;
  }
});

on('tournamentCreated', (msg) => {
  const TLobby: TLobbyState = msg.payload;
  setMyId(TLobby.hostId);
  localStorage.setItem('playerId', TLobby.hostId);
  history.pushState({}, '', `/tournament/${TLobby.code}`);
  renderTLobby(TLobby, getSocket());
});

on('tournamentUpdated', (msg) => {
  renderTLobby(msg.payload as TLobbyState, getSocket());
});

let tournaments: TourneySummary[] = [];

on('tournamentList', (msg) => {
  tournaments = msg.payload as TourneySummary[];
  if (window.location.pathname === '/tournament') {
    renderTournamentList(tournaments, joinByCodeWithSocket);
  }
});

on<'tournamentFinished'>('tournamentFinished', (msg) => {
  const { winnerId } = msg.payload;

  // stop any running game loop
  stopGame();
  teardownInput?.();               // remove key listeners
  teardownInput = null;

  // hide the bracket overlay and other pages
  hideAllPages();

  // optional: clear local tournament state if you store it
  setCurrentTLobby(null);
  localStorage.removeItem('currentGameId');
  currentTournamentId = null;
  isFirstRound        = true;

  // notify the user
  const myId = localStorage.getItem('playerId') ??
               (getSocket() as any).userId;

  if (myId === winnerId) {
    alert('🎉 Congratulations! You won the tournament! 🎉');
  } else {
    alert('Tournament finished.');
  }

  // return to main menu
  toggle_divs('home_div');
  window.location.href = '/';
});

on('tLobbyState', (msg) => {
  const lobby   = msg.payload as TLobbyState;
  const current = getCurrentTLobby();
  if (current && current.id !== lobby.id) return;
  setCurrentTLobby(lobby);
  renderTLobby(lobby, getSocket());
});

on<'eliminated'>('eliminated', (msg) => {
  const { reason } = msg.payload;

  alert('You have been eliminated from the tournament 🏳️');

  // Prevent stale state inside the SPA
  localStorage.removeItem('currentGameId');
  setCurrentTLobby(null as any);
  teardownInput?.();
  teardownInput = null;
  toggle_divs('home_div');
  window.location.href = '/';
});

on<'roundStarted'>('roundStarted', msg => {
  const { roundNumber } = msg.payload;
  console.log(`[play.ts] Round ${roundNumber} started.`);
  navigate(`/tournament/round${roundNumber}`);
});

/*
 * ────────────────────────────────────────────────────────────
 *  3.  Generic matchmaking & game‑page transitions
 * ────────────────────────────────────────────────────────────
 */

on('matchFound', (msg) => {
  const { gameId, mode, userId } = msg.payload;
  queued = false;
  markQueued?.(false);
  localStorage.setItem('currentGameId', gameId);
  localStorage.setItem('playerId', userId);
  navigate(`/game/${mode === 'PVP' || mode === '1v1' ? '1v1' : 'pve'}`);
});

/*
 * ────────────────────────────────────────────────────────────
 *  4.  UI helpers & routing
 * ────────────────────────────────────────────────────────────
 */

let markQueued: ((v: boolean) => void) | null = null;
let currentMode: string | null = null;
let queued = false;

function showVersusOverlay(left: string, right: string): Promise<void> {
  return new Promise<void>((resolve) => {
    let el = document.getElementById('vs-overlay') as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'vs-overlay';
      el.style.cssText = `
        position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
        background:rgba(0,0,0,.8); color:#fff; font:700 3rem/1 sans-serif; z-index:9999;
        text-align:center; opacity:0; transition:opacity .4s;`;
      document.body.appendChild(el);
    }

    el.textContent = `${left}  vs  ${right}`;
    requestAnimationFrame(() => (el!.style.opacity = '1'));

    const SHOW_MS = 2500;
    const HIDE_MS = 400;

    const hideTimer = setTimeout(() => {
      el!.style.opacity = '0';
    }, SHOW_MS);

    const onEnd = () => {
      cleanup();
      resolve();
    };
    el.addEventListener('transitionend', onEnd, { once: true });

    const fallbackTimer = setTimeout(() => {
      cleanup();
      resolve();
    }, SHOW_MS + HIDE_MS + 50);

    function cleanup() {
      clearTimeout(hideTimer);
      clearTimeout(fallbackTimer);
      el?.removeEventListener('transitionend', onEnd);
      el?.remove();
    }
  });
}

function joinByCodeWithSocket(code?: string) {
  joinByCode(getSocket(), code);
}

/*
 * ────────────────────────────────────────────────────────────
 *  5.  ROUND‑TO‑ROUND FLOW  (NEW setOnGameEnd implementation)
 * ────────────────────────────────────────────────────────────
 */

setOnGameEnd((winnerId: string) => {
  console.log('[play.ts] Game ended – winner:', winnerId);

  // stop arrow‑key listeners, mark state clean
  teardownInput?.();
  teardownInput = null;
  markQueued?.(false);
  queued = false;

  const myId = localStorage.getItem('playerId') ?? (getSocket() as any).userId;

  /*
   * The alert is synchronous. Code below runs only *after* the player clicks
   * “OK”. If I am one of the winners we schedule a beginRound after 2 seconds.
   */
  alert(`Player ${winnerId} wins!`);

  if (myId === winnerId && currentTournamentId) {
    setTimeout(() => {
      console.log('[play.ts] Winner acknowledged. Requesting next round…');
      send({
        type   : 'beginRound',
        payload: { tournamentId: currentTournamentId }
      });
    }, 2000);
  }
});

/* ───────────────────────────────────────── Route handling ── */

const navigate = (path: string) => {
  if (path === window.location.pathname) return;
  history.pushState({}, '', path);
  route();
};

const ROUND_RE = /^\/tournament\/round(\d+)$/;

function route() {
  const path = window.location.pathname;
  console.log('[route] current path:', path);
  teardownInput?.();             // stop old key listeners
  teardownInput = null;
  markQueued?.(false);

  hideAllPages();                // hides all “pages” incl. #game-container

  /* ───────────── Round page ───────────── */
  if (ROUND_RE.test(path)) {
    const [, roundStr] = path.match(ROUND_RE)!;
    const roundNo      = Number(roundStr);

    // show the bracket overlay (already rendered elsewhere)
    const overlay = document.getElementById('bracket-overlay');
    if (overlay) overlay.style.display = 'block';

    // headline “Round N”
    let hdr = document.getElementById('round-header') as HTMLElement | null;
    if (!hdr) {
      hdr = document.createElement('h2');
      hdr.id = 'round-header';
      overlay?.prepend(hdr);
    }
    hdr.textContent = `Round ${roundNo}`;

    return;
  }
  /* ────────────────────────────────────── */

  if (path === '/tournament') {
    document.getElementById('tournament-page')!.style.display = 'block';
    renderTournamentList(tournaments, joinByCodeWithSocket);
    return;
  }

  if (path === '/matchmaking') {
    enterMatchmaking();
    markQueued?.(true);
    document.getElementById('matchmaking-page')!.style.display = 'block';
    return;
  }

  if (path.startsWith('/game')) {
    document.getElementById('game-container')!.style.display = 'block';
    const mode = path.split('/')[2] || 'pve';
    console.log(`[play.ts] Entering game mode: ${mode}`);
    if (currentMode && currentMode !== mode) stopGame();   // stop previous loop
    currentMode = mode;

    initGameCanvas();
    if (['pve', '1v1'].includes(mode)) startGame(mode as GameMode);

    teardownInput = setupInputHandlers();        // new listeners for this room
    return;
  }

  if (path.startsWith('/tournament/')) {
    document.getElementById('t-lobby-page')!.style.display = 'block';
    return;
  }

  const mapping: Record<string, string> = {
    '/profile' : 'profile-page',
    '/settings': 'settings-page'
  };
  const pageId = mapping[path];
  if (pageId) {
    document.getElementById(pageId)!.style.display = 'block';
    return;
  }

  const mainMenuEl = document.getElementById('main-menu');
  if (mainMenuEl) {
    mainMenuEl.style.display = 'block';
  }
}

function showGameContainerAndStart(): void {
  const cont = document.getElementById('game-container');
  if (!cont) return;

  cont.style.display = 'block';
  initGameCanvas();                // from game.js
  startGame('1v1');                // from game.js
  teardownInput = setupInputHandlers();
}

export function check() {
  const path = window.location.pathname;
  if (path === '/play') {
    setupCodeJoinHandlers();
    setupButtonsDelegated(navigate, getSocket());
    ({ markQueued } = setupMatchmakingHandlers(navigate, getSocket()));
    route();
  }
}

window.addEventListener('popstate', check);

/* ─────────────────────────────────────────
 *  Matchmaking helpers – unchanged
 * ───────────────────────────────────────── */

function enterMatchmaking() {
  if (queued) return;
  queued = true;
  send({ type: 'joinQueue', payload: { mode: '1v1' } });
}

function leaveMatchmaking() {
  if (!queued) return;
  queued = false;
  send({ type: 'leaveQueue' });
}

function amHost(): boolean {
  const lobby = getCurrentTLobby();
  const myId  = localStorage.getItem('playerId') ?? (getSocket() as any).userId;
  return lobby?.hostId === myId;
}

export function setupCodeJoinHandlers() {
  const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null;
  const codeBtn   = document.getElementById('t-code-btn') as HTMLButtonElement | null;
  if (!codeInput || !codeBtn) return;
  codeBtn.addEventListener('click', () => joinByCodeWithSocket());
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinByCodeWithSocket();
  });
}
