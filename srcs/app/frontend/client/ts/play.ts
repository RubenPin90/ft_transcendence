import {
  initGameCanvas,
  startGame,
  stopGame,
  setOnGameEnd,
  GameMode,
  drawFrame,
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
  PlayerStub
} from './types.js';
import { setMyId, setCurrentTLobby, getCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
import { setupMatchmakingHandlers } from './matchmaking.js';
import { on, send, getSocket } from './socket.js';

// ────────────────────────────────────────────────────────────
//  1.  guarantee we have a socket right away and recover userId
// ────────────────────────────────────────────────────────────
const socket = getSocket();

let currentRoomId: string | null = null;
let userId: string | null = null;

// ────────────────────────────────────────────────────────────
//  2.  generic error banner
// ────────────────────────────────────────────────────────────
on('welcome', (msg) => {
  const { userId } = msg.payload;
  localStorage.setItem('playerId', userId);
  (socket as any).userId = userId;
});

on('error', (msg) => {
  const banner = document.getElementById('error-banner')!;
  banner.textContent = msg.payload.message;
  banner.style.display = 'block';
});

// ────────────────────────────────────────────────────────────
//  3.  TLobby and tournament events – unchanged API
// ────────────────────────────────────────────────────────────
on('joinedTLobby', (msg) => {
  const { playerId, TLobby } = msg.payload;
  setMyId(playerId);
  localStorage.setItem('playerId', playerId);
  if (TLobby) {
    setCurrentTLobby(TLobby);
    history.pushState({}, '', `/tournament/${TLobby.code}`);
    renderTLobby(TLobby, socket);
  }
});

on<'matchAssigned'>('matchAssigned', (msg) => {
  // We no longer show the versus‐overlay here; just do the join/navigation logic.
  const { tournamentId, matchId, players } = msg.payload;
  const myId =
    localStorage.getItem('playerId') ?? (socket as any).userId;
  const me = players.find((p) => p.id === myId);
  const rival = players.find((p) => p.id !== myId);
  if (!me || !rival) return;

  localStorage.setItem('currentGameId', matchId);
  currentRoomId = matchId;

  setTimeout(() => {
    send({ type: 'joinMatchRoom', payload: { tournamentId, matchId } });
    navigate('/game/1v1');
  }, 3000);
});

on<'tournamentBracketMsg'>('tournamentBracketMsg', (msg) => {
  let rounds = msg.payload.rounds as unknown;
  if (Array.isArray(rounds) && !Array.isArray(rounds[0])) {
    rounds = [rounds];
  }

  // Render the bracket immediately:
  renderBracketOverlay(rounds as BracketRounds);

  // After 1 second, find the first fully-known match in the first round:
  setTimeout(() => {
    const br = rounds as BracketRounds;
    if (!Array.isArray(br) || br.length === 0) {
      return;
    }

    const firstRound: MatchStub[] = br[0];
    // Iterate over each MatchStub in round 1 until we find two real PlayerStubs:
    for (const match of firstRound) {
      // Filter out anything that is not a real PlayerStub:
      const realPlayers = match.players.filter(
        (p): p is PlayerStub =>
          p !== null && typeof (p as any).pendingMatchId === 'undefined');

      if (realPlayers.length === 2) {
        const leftName = realPlayers[0].name;
        const rightName = realPlayers[1].name;
        showVersusOverlay(leftName, rightName);
        return; // stop after showing the first valid “vs” overlay
      }
      // If you want to allow a “waiting on opponent” display when one side is pendingMatchId,
      // you could check for p having pendingMatchId and show a different overlay. But
      // as written, we only show “X vs Y” when both are non-null PlayerStub.
    }
    // If no match in round 1 has two concrete players yet, do nothing.
  }, 1000);
});


on('tournamentCreated', (msg) => {
  const TLobby: TLobbyState = msg.payload;
  setMyId(TLobby.hostId);
  localStorage.setItem('playerId', TLobby.hostId);
  history.pushState({}, '', `/tournament/${TLobby.code}`);
  renderTLobby(TLobby, socket);
});

on('tournamentUpdated', (msg) => {
  renderTLobby(msg.payload as TLobbyState, socket);
});

let tournaments: TourneySummary[] = [];

on('tournamentList', (msg) => {
  tournaments = msg.payload as TourneySummary[];
  if (window.location.pathname === '/tournament') {
    renderTournamentList(tournaments, joinByCodeWithSocket);
  }
});

on('tLobbyState', (msg) => {
  const lobby = msg.payload as TLobbyState;
  const current = getCurrentTLobby();
  if (current && current.id !== lobby.id) return;
  setCurrentTLobby(lobby);
  renderTLobby(lobby, socket);
});

// ────────────────────────────────────────────────────────────
//  4.  Generic matchmaking & game-page transitions
// ────────────────────────────────────────────────────────────
on('matchFound', (msg) => {
  const { gameId, mode, userId } = msg.payload;
  queued = false;
  markQueued?.(false);
  localStorage.setItem('currentGameId', gameId);
  localStorage.setItem('playerId', userId);
  navigate(`/game/${mode === 'PVP' || mode === '1v1' ? '1v1' : 'pve'}`);
});



// ────────────────────────────────────────────────────────────
//  5.  UI helpers & routing
// ────────────────────────────────────────────────────────────
let markQueued: (v: boolean) => void;
let currentMode: string | null = null;
let queued = false;

function showVersusOverlay(left: string, right: string) {
  let el = document.getElementById('vs-overlay') as HTMLElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'vs-overlay';
    el.style.cssText = `
      position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,.8);color:#fff;font:700 3rem sans-serif;z-index:9999;
      text-align:center;`;
    document.body.appendChild(el);
  }
  el.textContent = `${left}  vs  ${right}`;
  el.style.opacity = '1';
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 2500);
  setTimeout(() => { el.remove(); }, 3000);
}

function joinByCodeWithSocket(code?: string) {
  joinByCode(socket, code);
}

setOnGameEnd((winnerId: string) => {
  alert(`Player ${winnerId} wins!`);
});

const navigate = (path: string) => {
  if (path === window.location.pathname) return;
  history.pushState({}, '', path);
  route();
};

function route() {
  const path = window.location.pathname;
  hideAllPages();

  if (path === '/tournament') {
    document.getElementById('tournament-page')!.style.display = 'block';
    renderTournamentList(tournaments, joinByCodeWithSocket);
    return;
  }
  if (path === '/matchmaking') {
    enterMatchmaking();
    markQueued(true);
    document.getElementById('matchmaking-page')!.style.display = 'block';
    return;
  }
  if (path.startsWith('/game')) {
    document.getElementById('game-container')!.style.display = 'block';
    const mode = path.split('/')[2] || 'pve';
    (document.getElementById('game-mode-title') as HTMLElement).textContent = 'Mode: ' + mode;
    if (currentMode && currentMode !== mode) stopGame();
    currentMode = mode;
    initGameCanvas();
    if (['pve', '1v1'].includes(mode)) startGame(mode as GameMode);
    return;
  }
  if (path.startsWith('/tournament/')) {
    document.getElementById('t-lobby-page')!.style.display = 'block';
    return;
  }
  const mapping: Record<string, string> = { '/profile': 'profile-page', '/settings': 'settings-page' };
  const pageId = mapping[path];
  if (pageId) {
    document.getElementById(pageId)!.style.display = 'block';
  } else {
    document.getElementById('main-menu')!.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupCodeJoinHandlers();
  setupButtonsDelegated(navigate, socket);
  ({ markQueued } = setupMatchmakingHandlers(navigate, socket));
  window.addEventListener('popstate', route);
  route();
});

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

function setupCodeJoinHandlers() {
  const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null;
  const codeBtn   = document.getElementById('t-code-btn') as HTMLButtonElement | null;
  if (!codeInput || !codeBtn) return;
  codeBtn.addEventListener('click', () => joinByCodeWithSocket());
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinByCodeWithSocket();
  });
}
