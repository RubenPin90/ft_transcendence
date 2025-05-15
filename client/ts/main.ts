import {
  initGameCanvas,
  startGame,
  stopGame,
  setOnGameEnd,
  GameMode
} from './game.js'

import {
  renderTournamentList,
  joinByCode,
  TourneySummary,
  renderTLobby
} from './tournament.js'

import { setupButtons } from './buttons.js'
import type { TLobbyState } from './types.js'

import { setMyId, setCurrentTLobby, getCurrentTLobby } from './state.js'
import { hideAllPages } from './helpers.js'
import { setupMatchmakingHandlers } from './matchmaking.js'
import { getSocket } from './socket.js';

let markQueued: (v: boolean) => void;
let currentMode: string | null = null
let tournaments: TourneySummary[] = []
let myId: string = localStorage.getItem('playerId') ?? ''
let queued = false;  


const socket = getSocket();   

socket.addEventListener('open', handleOpen);
socket.addEventListener('error', handleError);
socket.addEventListener('message', handleMessage);

function joinByCodeWithSocket(code?: string) {
  joinByCode(getSocket(), code)
}
function handleOpen() {
  console.log('[WS] TLobby socket open')
}

function handleError(err: Event) {
  console.error('[WS] TLobby error', err)
}

function handleMessage(ev: MessageEvent) {
  const data = JSON.parse(ev.data)

  switch (data.type) {
    case 'error': {
      const banner = document.getElementById('error-banner')!
      banner.textContent = data.payload.message
      banner.style.display = 'block'
      break
    }
    case 'joinedTLobby': {
      console.log('received data', data)
      const { playerId, TLobby } = data.payload
      setMyId(playerId)
      localStorage.setItem('playerId', playerId)
      if (TLobby) {
        setCurrentTLobby(TLobby)
        history.pushState({}, '', `/tournament/${TLobby.code}`)
        renderTLobby(TLobby, getSocket())
      }
      break
    }
    case 'tournamentCreated': {
      const TLobby: TLobbyState = data.payload
      setMyId(TLobby.hostId)
      localStorage.setItem('playerId', TLobby.hostId)
      history.pushState({}, '', `/tournament/${TLobby.code}`)
      renderTLobby(TLobby, getSocket())
      break
    }
    case 'tournamentUpdated': {
      console.log('received data12', data)
      renderTLobby(data.payload as TLobbyState, getSocket())
      break
    }
    case 'tournamentList': {
      tournaments = data.payload as TourneySummary[]
      if (window.location.pathname === '/tournament') {
        renderTournamentList(tournaments, joinByCodeWithSocket)
      }
      break
    }
    default: {
      console.warn('[WS] Unhandled message', data);   // 👈 leave this in permanently
      break;
    }
  }
}

getSocket().addEventListener('open', handleOpen)
getSocket().addEventListener('error', handleError)
getSocket().addEventListener('message', handleMessage)


setOnGameEnd((winnerId: string) => {
  alert(`Player ${winnerId} wins!`)
})

const navigate = (path: string) => {
  if (path === window.location.pathname) return
  history.pushState({}, '', path)
  route()
}

function route() {
  const path = window.location.pathname
  hideAllPages()
  if (path === '/tournament') {
    document.getElementById('tournament-page')!.style.display = 'block'
    renderTournamentList(tournaments, joinByCodeWithSocket)
    return
  }
  if (path === '/matchmaking') {
    enterMatchmaking();           // sends joinQueue
    markQueued(true);             // <‑‑ tell matchmaking.ts we're queued
    document.getElementById('matchmaking-page')!.style.display = 'block';
    return;
  }
  if (path.startsWith('/game')) {
    document.getElementById('game-container')!.style.display = 'block'
    const mode = path.split('/')[2] || 'pve'
    ;(document.getElementById('game-mode-title') as HTMLElement).textContent =
      'Mode: ' + mode

    if (currentMode && currentMode !== mode) stopGame()
    currentMode = mode
    initGameCanvas()
    if (['pve', '1v1'].includes(mode)) startGame(mode as GameMode)
    setOnGameEnd(winnerId => {
      stopGame()
      alert(`Game over! Player ${winnerId} wins!`)
    })
    return
  }
  if (path.startsWith('/tournament/')) {
       document.getElementById('t-lobby-page')!.style.display = 'block';
       return;
  }
  const mapping: Record<string, string> = {
    '/profile': 'profile-page',
    '/settings': 'settings-page'
  }
  const pageId = mapping[path]
  if (pageId){
    console.log('showing page:', pageId, document.getElementById(pageId));
    document.getElementById(pageId)!.style.display = 'block'
  } 
  else{ 
  console.log('showing page:', pageId, document.getElementById(pageId));
  document.getElementById('main-menu')!.style.display = 'block'
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigationButtons()
  setupCodeJoinHandlers()
  setupButtons(navigate, getSocket(), getCurrentTLobby);
  ({ markQueued } = setupMatchmakingHandlers(navigate, getSocket())); // already closed )
  window.addEventListener('popstate', route)
  route()
})

function enterMatchmaking() {
  if (queued) return;                // <- guard
  queued = true;
  // Helper that always sends joinQueue once the socket is open
  console.log('entering matchmaking')
  const sendJoin = () =>
    getSocket().send(JSON.stringify({
      type: 'joinQueue',
      payload: { mode: '1v1' }
    }));

  if (getSocket().readyState === WebSocket.OPEN) {
    sendJoin();
  } else {
    getSocket().addEventListener('open', function once() {
      getSocket().removeEventListener('open', once);
      sendJoin();
    });
  }
}

function leaveMatchmaking() {
  if (!queued) return;
  queued = false;
  if (getSocket().readyState === WebSocket.OPEN) {
    getSocket().send(JSON.stringify({ type: 'leaveQueue' }));
  }
}

function setupNavigationButtons() {
  const btnMap: Record<string, string> = {
    'sp-vs-pve-btn': '/game/pve',
    'one-vs-one-btn': '/matchmaking',
    'Tournament-btn': '/tournament',
    'settings-btn': '/settings',
    'profile-btn': '/profile'
  }
  for (const [btnId, routePath] of Object.entries(btnMap)) {
    document.getElementById(btnId)?.addEventListener('click', () => navigate(routePath))
  }
}

function setupCodeJoinHandlers() {
  const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null
  const codeBtn = document.getElementById('t-code-btn') as HTMLButtonElement | null
  if (!codeInput || !codeBtn) return
  codeBtn.addEventListener('click', () => joinByCodeWithSocket())
  codeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') joinByCodeWithSocket()
  })
}
