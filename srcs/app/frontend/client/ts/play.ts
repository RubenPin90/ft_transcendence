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

let currentRoomId: string | null       = null;
let currentMatch: string | null        = null;
let teardownInput: (() => void) | null = null;



let currentTournamentId: string | null = null;
let isFirstRound                       = true;


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
  currentTournamentId  = tournamentId;

  setTimeout(() => {
    send({ type: 'joinMatchRoom', payload: { tournamentId, matchId } });
    showGameContainerAndStart();
  }, 3000);
});

on<'tournamentBracketMsg'>('tournamentBracketMsg', async (msg) => {
  const { tournamentId, rounds } = msg.payload as {
    tournamentId: string;
    rounds: MatchStub[][] | MatchStub[];
  };

  currentTournamentId = tournamentId;

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

  stopGame();
  teardownInput?.();               
  teardownInput = null;

  hideAllPages();

  setCurrentTLobby(null);
  localStorage.removeItem('currentGameId');
  currentTournamentId = null;
  isFirstRound        = true;

  const myId = localStorage.getItem('playerId') ??
               (getSocket() as any).userId;

  if (myId === winnerId) {
    alert('🎉 Congratulations! You won the tournament! 🎉');
  } else {
    alert('Tournament finished.');
  }

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


on('matchFound', (msg) => {
  const { gameId, mode, userId } = msg.payload;
  queued = false;
  markQueued?.(false);
  localStorage.setItem('currentGameId', gameId);
  localStorage.setItem('playerId', userId);
  navigate(`/game/${mode === 'PVP' || mode === '1v1' ? '1v1' : 'pve'}`);
});


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

setOnGameEnd((winnerId: string) => {
  console.log('[play.ts] Game ended – winner:', winnerId);

  teardownInput?.();
  teardownInput = null;
  markQueued?.(false);
  queued = false;

  const myId = localStorage.getItem('playerId') ?? (getSocket() as any).userId;

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


const navigate = (path: string) => {
  if (path === window.location.pathname) return;
  history.pushState({}, '', path);
  route();
};

const ROUND_RE = /^\/tournament\/round(\d+)$/;

const GAME_RE = /^\/game\/(?:pve|1v1)$/;
let wasInGame = false;
export let lastPath: string | null = null;

function route() {
  const TLobbySocket = getSocket();
  const path = window.location.pathname;
  console.log('[route] current path:', path);
  console.log('lastPath:', lastPath);

  if (path === '/matchmaking' && lastPath !== '/play') {
    console.log('[route] blocked direct /matchmaking; redirecting to /play');
    window.history.replaceState(null, '', '/play');
    return route();
  }
  if (lastPath === '/matchmaking' && lastPath != path)
    leaveMatchmaking();
  // if (path.startsWith('/tournament/')) {

  if ((path === '/tournament' && lastPath !== '/play') || (path === '/tournament' && lastPath?.startsWith('/tournament/'))) {
    const TLobby = getCurrentTLobby();
    if (TLobby) {
      TLobbySocket.send(JSON.stringify({
        type: 'leaveTournament',
        payload: TLobby ? { tournamentId: TLobby.id } : {}
      }));
      setCurrentTLobby(null);
    }
    if (lastPath?.startsWith('/tournament/')) {
      document.getElementById('tournament-page')!.style.display = 'block';
      renderTournamentList(tournaments, joinByCodeWithSocket);
      return;
    }
    else{
      console.log('[route] blocked direct /tournament; redirecting to /play');
      window.history.replaceState(null, '', '/play');
    }
    return route();
  }

  if (GAME_RE.test(path)) {
    const mode = path.split('/')[2];
    if (mode === '1v1' && lastPath !== '/matchmaking') {
      console.log('[route] blocked direct /game/1v1; redirecting to /play');
      window.history.replaceState(null, '', '/play');
      return route();
    }
  }

  teardownInput?.();
  teardownInput = null;
  markQueued?.(false);

  hideAllPages();
  lastPath = path;
  if (wasInGame && !GAME_RE.test(path)) {
    const roomId = localStorage.getItem('currentGameId');
    const userId = localStorage.getItem('playerId');
    if (roomId && userId) {
      console.log('[route] Detected leaving /game, sending leaveGame');
      send({
        type: 'leaveGame',
        payload: { roomId, userId }
      });
      localStorage.removeItem('currentGameId');
    }
  }

  wasInGame = GAME_RE.test(path);

  if (ROUND_RE.test(path)) {
    const [, roundStr] = path.match(ROUND_RE)!;
    const roundNo      = Number(roundStr);

    const overlay = document.getElementById('bracket-overlay');
    if (overlay) overlay.style.display = 'block';

    let hdr = document.getElementById('round-header') as HTMLElement | null;
    if (!hdr) {
      hdr = document.createElement('h2');
      hdr.id = 'round-header';
      overlay?.prepend(hdr);
    }
    hdr.textContent = `Round ${roundNo}`;
    return;
  }

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

  if (GAME_RE.test(path)) {
    document.getElementById('game-container')!.style.display = 'block';
    const mode = path.split('/')[2] || 'pve';
    console.log(`[play.ts] Entering game mode: ${mode}`);

    if (currentMode && currentMode !== mode) {
      stopGame(); 
    }
    currentMode = mode;

    initGameCanvas();
    if (['pve', '1v1'].includes(mode)) {
      startGame(mode as GameMode);
      teardownInput = () => {
      };
    }

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
    return;
  }

  const mainMenuEl = document.getElementById('main-menu');
  if (mainMenuEl) {
    mainMenuEl.style.display = 'block';
  }
}

window.addEventListener('popstate', () => {
  route();
});

window.addEventListener('beforeunload', () => {
  if (localStorage.getItem('currentGameId')) {
    const roomId = localStorage.getItem('currentGameId')!;
    const userId = localStorage.getItem('playerId')!;
    console.log('[beforeunload] sending leaveGame');
    send({ type: 'leaveGame', payload: { roomId, userId } });
  }
});

function showGameContainerAndStart(): void {
  const cont = document.getElementById('game-container');
  if (!cont) return;

  cont.style.display = 'block';
  initGameCanvas();   
  startGame('1v1');        
  teardownInput = setupInputHandlers();
}

export function check() {
  console.log('in check()');
  const path = window.location.pathname;
  if (path === '/play') {
    lastPath = path;
    setupCodeJoinHandlers();
    setupButtonsDelegated(navigate, getSocket());
    ({ markQueued } = setupMatchmakingHandlers(navigate, getSocket()));
    route();
  }
}

window.addEventListener('popstate', check);


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
