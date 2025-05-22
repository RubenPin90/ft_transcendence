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
  renderTLobby,
  renderBracketOverlay
} from './tournament.js';
import { setupButtonsDelegated} from './buttons.js';
import type { TLobbyState } from './types.js';
import { setMyId, setCurrentTLobby, getCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
import { setupMatchmakingHandlers } from './matchmaking.js';
import { on, off, send, getSocket } from './socket.js';
import { randomUUID } from 'crypto';

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

on<'tournamentBracketMsg'>('tournamentBracketMsg', (msg) => {
  renderBracketOverlay(msg.payload.rounds);
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

on('tLobbyState', (msg) => {
  console.log('tLobbyState', msg);
  const lobby   = msg.payload as TLobbyState;
  const current = getCurrentTLobby();

  if (current && current.id !== lobby.id) return;

  setCurrentTLobby(lobby);
  renderTLobby(lobby, getSocket());
});

on('matchFound', (msg) => {
  const { gameId, mode, userId } = msg.payload;

  queued = false;
  markQueued?.(false);

  localStorage.setItem('currentGameId', gameId);
  localStorage.setItem('playerId',        userId);

  navigate(`/game/${mode === 'PVP' || mode === '1v1' ? '1v1' : 'pve'}`);
});

on<'matchAssigned'>('matchAssigned', (msg) => {
  const { tournamentId, matchId, players } = msg.payload;

  // Pick me vs. opponent (works with your existing state helpers)
  const myId     = localStorage.getItem('playerId');
  const me       = players.find(p => p.id === myId);
  const rival    = players.find(p => p.id !== myId);

  if (!me || !rival) return;   // shouldn’t happen

  showVersusOverlay(me.name, rival.name);

  // Tell the server we’re ready (optional handshake)
  send({ type: 'joinMatchRoom', payload: { tournamentId, matchId } });

  // After 3 s go to the game page exactly like matchFound does
  setTimeout(() => {
    localStorage.setItem('currentGameId', matchId);
    navigate('/game/1v1');
  }, 3000);
});


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
      text-align:center;
    `;
    document.body.appendChild(el);
  }
  el.textContent = `${left}  vs  ${right}`;
  el.style.opacity = '1';

  // Fade out automatically
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 2500);
  setTimeout(() => { el.remove(); }, 3000);
}


function joinByCodeWithSocket(code?: string) {
  joinByCode(getSocket(), code);
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

document.addEventListener('DOMContentLoaded', () => {
  // setupNavigationButtons(navigate);
  setupCodeJoinHandlers();
  setupButtonsDelegated(navigate, getSocket());
  ({ markQueued } = setupMatchmakingHandlers(navigate, getSocket()));

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
  send({ type: 'leaveQueue'});
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