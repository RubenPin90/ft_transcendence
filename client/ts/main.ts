// main.ts – UI + routing wired to the central message bus

import {
  initGameCanvas,
  startGame,
  stopGame,
  setOnGameEnd,
  GameMode
} from './game.js';

import {
  renderTournamentList,
  joinByCode,
  TourneySummary,
  renderTLobby
} from './tournament.js';

import { setupButtons } from './buttons.js';
import type { TLobbyState } from './types.js';

import { setMyId, setCurrentTLobby, getCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
import { setupMatchmakingHandlers } from './matchmaking.js';
import { on, off, send, getSocket } from './socket.js';

//------------------------------------------------------------------
// ─── Real-time subscriptions via the message bus ──────────────────
//------------------------------------------------------------------

on('error', (msg) => {
  const banner = document.getElementById('error-banner')!;
  banner.textContent = msg.payload.message;
  banner.style.display = 'block';
});

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

on('matchFound', (msg) => {
  const { gameId, mode, userId } = msg.payload;

  queued = false;
  markQueued?.(false);

  localStorage.setItem('currentGameId', gameId);
  localStorage.setItem('playerId',        userId);

  navigate(`/game/${mode === 'PVP' || mode === '1v1' ? '1v1' : 'pve'}`);
});


//------------------------------------------------------------------
// ─── State for routing / UI ───────────────────────────────────────
//------------------------------------------------------------------

let markQueued: (v: boolean) => void;
let currentMode: string | null = null;
let queued = false;

//------------------------------------------------------------------
// ─── Helpers that still need the raw socket ───────────────────────
//------------------------------------------------------------------

function joinByCodeWithSocket(code?: string) {
  joinByCode(getSocket(), code);
}

//------------------------------------------------------------------
// ─── Routing & Navigation ────────────────────────────────────────
//------------------------------------------------------------------

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
    (document.getElementById('game-mode-title') as HTMLElement).textContent =
      'Mode: ' + mode;

    if (currentMode && currentMode !== mode) stopGame();
    currentMode = mode;

    initGameCanvas();
    if (['pve', '1v1'].includes(mode)) startGame(mode as GameMode);

    setOnGameEnd((winnerId) => {
      stopGame();
      alert(`Game over! Player ${winnerId} wins!`);
    });
    return;
  }

  if (path.startsWith('/tournament/')) {
    document.getElementById('t-lobby-page')!.style.display = 'block';
    return;
  }

  const mapping: Record<string, string> = {
    '/profile': 'profile-page',
    '/settings': 'settings-page'
  };
  const pageId = mapping[path];
  if (pageId) {
    document.getElementById(pageId)!.style.display = 'block';
  } else {
    document.getElementById('main-menu')!.style.display = 'block';
  }
}

//------------------------------------------------------------------
// ─── App bootstrapping ────────────────────────────────────────────
//------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  setupNavigationButtons();
  setupCodeJoinHandlers();
  setupButtons(navigate, getSocket());
  ({ markQueued } = setupMatchmakingHandlers(navigate, getSocket()));

  window.addEventListener('popstate', route);
  route();
});

//------------------------------------------------------------------
// ─── Matchmaking helpers (now using message bus) ──────────────────
//------------------------------------------------------------------

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

//------------------------------------------------------------------
// ─── UI wiring helpers ────────────────────────────────────────────
//------------------------------------------------------------------

function setupNavigationButtons() {
  const btnMap: Record<string, string> = {
    'sp-vs-pve-btn': '/game/pve',
    'one-vs-one-btn': '/matchmaking',
    'Tournament-btn': '/tournament',
    'settings-btn': '/settings',
    'profile-btn': '/profile'
  };
  for (const [btnId, routePath] of Object.entries(btnMap)) {
    document.getElementById(btnId)?.addEventListener('click', () => navigate(routePath));
  }
}

function setupCodeJoinHandlers() {
  const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null;
  const codeBtn = document.getElementById('t-code-btn') as HTMLButtonElement | null;
  if (!codeInput || !codeBtn) return;
  codeBtn.addEventListener('click', () => joinByCodeWithSocket());
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinByCodeWithSocket();
  });
}
