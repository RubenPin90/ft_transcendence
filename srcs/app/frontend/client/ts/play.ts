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
  renderTLobby
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
let startedTournament: boolean = false;



let currentTournamentId: string | null = null;
let isFirstRound                       = true;

on('welcome', (msg) => {
  const id   = msg.payload.userId;
  localStorage.setItem('playerId', id);

  const sock = getSocket();
  (sock as any).userId = id;
});

on('error', (msg) => {
  console.error(`Error: ${msg}`);
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
  const normalized = Array.isArray(rounds[0])
    ? rounds as MatchStub[][]
    : [rounds as MatchStub[]];

  await new Promise(r => setTimeout(r, 700));

  const lastRound  = normalized[normalized.length - 1];
  const nextMatch = lastRound.find(
    m => m.players.filter(p => p && !('pendingMatchId' in p)).length === 2
  );

  if (nextMatch) {
    const [A, B] = nextMatch.players as PlayerStub[];
    await showVersusOverlay(A.name, B.name);

    send({
      type   : 'waitForNextMatch',
      payload: {
        tournamentId,
        matchId     : nextMatch.matchId
      }
    });
  }

  if (isFirstRound) {
    const firstRound = normalized[0];
    const firstMatch = firstRound.find(
      m => m.players.filter(p => p && !('pendingMatchId' in p)).length === 2
    );
  
    if (firstMatch) {
      const [A, B] = firstMatch.players as PlayerStub[];
      await showVersusOverlay(A.name, B.name);
    }
    send({ type: 'beginRound', payload: { tournamentId } });
    isFirstRound = false;
    startedTournament = true;
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
  if (isInGame()) return;
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

  const TLobbySocket = getSocket();
  const TLobby = getCurrentTLobby();
  TLobbySocket.send(JSON.stringify({
    type: 'leaveTournament',
    payload: TLobby ? { tournamentId: TLobby.id } : {}
  }));
  currentTournamentId = null;
  isFirstRound        = true;
  setCurrentTLobby(null);
  localStorage.removeItem('currentGameId');

  const myId = localStorage.getItem('playerId') ??
               (getSocket() as any).userId;

  if (myId === winnerId) {
    alert('🎉 Congratulations! You won the tournament! 🎉');
  } else {
    alert('Tournament finished.');
  }
  navigate('/play');
});

on('tLobbyState', (msg) => {
  if (isInGame()) return;
  const lobby   = msg.payload as TLobbyState;
  const current = getCurrentTLobby();
  if (current && current.id !== lobby.id) return;
  setCurrentTLobby(lobby);
  renderTLobby(lobby, getSocket());
});

on<'eliminated'>('eliminated', (msg) => {
  const { reason } = msg.payload;
  alert('You have been eliminated from the tournament 🏳️');
  const TLobbySocket = getSocket();
  const TLobby = getCurrentTLobby();
  if (TLobby) {
    TLobbySocket.send(JSON.stringify({
      type: 'leaveTournament',
      payload: TLobby ? { tournamentId: TLobby.id } : {}
    }));
    setCurrentTLobby(null);
  }
  currentTournamentId = null;
  isFirstRound        = true;
  localStorage.removeItem('currentGameId');
  setCurrentTLobby(null as any);
  
  teardownInput?.();
  teardownInput = null;
  navigate('/play');
});

on<'roundStarted'>('roundStarted', msg => {
  const { roundNumber } = msg.payload;
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
      el.className = `fixed inset-0 flex items-center justify-center bg-black/80 text-white font-bold text-3xl leading-none z-[9999] text-center opacity-0 transition-opacity duration-[400ms]`;
      document.body.appendChild(el);
    }

    el.textContent = `${left}  vs  ${right}`;
    requestAnimationFrame(() => {
      el!.classList.remove('opacity-0');
      el!.classList.add('opacity-100'); 
    });

    const SHOW_MS = 2500;
    const HIDE_MS = 400;

    const hideTimer = setTimeout(() => {
      el!.classList.remove('opacity-100');
      el!.classList.add('opacity-0');
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

  teardownInput?.();
  teardownInput = null;
  markQueued?.(false);
  queued = false;

  const myId = localStorage.getItem('playerId') ?? (getSocket() as any).userId;

  if (myId === winnerId)  
  {
    alert('🎉 You won the game! 🎉');
  } 
  else {
    alert('Game over. You lost.');
  }
  if (!currentTournamentId) {
    navigate('/play');
    return;
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
  const main_div = document.getElementById('game-main-container')!.classList.replace('game_field', 'field');
  
  const TLobbySocket = getSocket();
  const path = window.location.pathname;

  if (lastPath?.startsWith('/tournament/') && !path.startsWith('/tournament')) {
    const TLobby = getCurrentTLobby();
    if (TLobby) {
      TLobbySocket.send(JSON.stringify({
        type: 'leaveTournament',
        payload: { tournamentId: TLobby.id }
      }));
      setCurrentTLobby(null);
    }
    currentTournamentId = null;
    isFirstRound = true;   
  }

  if (path === '/matchmaking' && lastPath !== '/play') {
    window.history.replaceState(null, '', '/play');
    return route();
  }
  if (lastPath === '/matchmaking' && lastPath != path)
    leaveMatchmaking();

  if ((path === '/tournament' && lastPath !== '/play') || (path === '/tournament' && lastPath?.startsWith('/tournament/'))) {
    const TLobby = getCurrentTLobby();
    if (TLobby) {
      TLobbySocket.send(JSON.stringify({
        type: 'leaveTournament',
        payload: TLobby ? { tournamentId: TLobby.id } : {}
      }));
      if (localStorage.getItem('currentGameId')) {
        localStorage.removeItem('currentGameId');
      }
      currentTournamentId = null;
      isFirstRound = true;
      setCurrentTLobby(null);
    }
    if (lastPath?.startsWith('/tournament/')) {
      const tournament_page = document.getElementById('tournament-page') as HTMLElement;
      tournament_page?.classList.add('block');
      tournament_page?.classList.remove('hidden');
      currentTournamentId = null;
      isFirstRound = true;
      renderTournamentList(tournaments, joinByCodeWithSocket);
      return;
    }
    else{
      window.history.replaceState(null, '', '/play');
    }
    return route();
  }

  if (GAME_RE.test(path)) {
    const mode = path.split('/')[2];
    if (mode === '1v1' && lastPath !== '/matchmaking') {
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
    if (overlay) {
      overlay.classList.add('block');
      overlay.classList.remove('hidden');
    }

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
    (document.getElementById('tournament-page') as HTMLElement)!.classList.add('block');
    (document.getElementById('tournament-page') as HTMLElement)!.classList.remove('hidden');
    currentTournamentId = null;
    isFirstRound = true;
    renderTournamentList(tournaments, joinByCodeWithSocket);
    return;
  }

  if (path === '/matchmaking') {
    enterMatchmaking();
    markQueued?.(true);
    (document.getElementById('matchmaking_div') as HTMLElement)!.classList.add('block');
    (document.getElementById('matchmaking_div') as HTMLElement)!.classList.remove('hidden');
    return;
  }

  if (GAME_RE.test(path)) {
    (document.getElementById('game-container') as HTMLElement)!.classList.add('block');
    (document.getElementById('game-container') as HTMLElement)!.classList.remove('hidden');
    const mode = path.split('/')[2] || 'pve';

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
    (document.getElementById('t-lobby-page') as HTMLElement)!.classList.add('block');
    (document.getElementById('t-lobby-page') as HTMLElement)!.classList.remove('hidden');
    return;
  }

  const mapping: Record<string, string> = {
    '/profile': 'profile-page',
    '/settings': 'settings-page'
  };
  const pageId = mapping[path];
  if (pageId) {
    (document.getElementById(pageId) as HTMLElement)!.classList.add('block');
    (document.getElementById(pageId) as HTMLElement)!.classList.remove('hidden');
    return;
  }

  const mainMenuEl = document.getElementById('main-menu');
  if (mainMenuEl) {
    mainMenuEl.classList.add('block');
    mainMenuEl.classList.remove('hidden');
  }
}

function isInGame(): boolean {
  if (GAME_RE.test(window.location.pathname))
  {
    return true;
  }
  else
    return false;
}

window.addEventListener('popstate', () => {
  route();
});

function showGameContainerAndStart(): void {
  hideAllPages();
  const cont = document.getElementById('game-container');
  if (!cont) return;

  cont.classList.add('block');
  cont.classList.remove('hidden');
  initGameCanvas();   
  startGame('1v1');        
  teardownInput = setupInputHandlers();
}

export function check() {
  const path = window.location.pathname;
  if (path === '/play') {
    lastPath = path;
    currentTournamentId = null;
    isFirstRound = true;
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

export function setupCodeJoinHandlers() {
  const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null;
  const codeBtn   = document.getElementById('t-code-btn') as HTMLButtonElement | null;
  if (!codeInput || !codeBtn) return;
  codeBtn.addEventListener('click', () => joinByCodeWithSocket());
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinByCodeWithSocket();
  });
}
