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
  renderLobby
} from './tournament.js'

import { setupButtons } from './buttons.js'
import type { LobbyState } from './types.js'

import { setMyId, setCurrentLobby } from './state.js'
import { hideAllPages } from './helpers.js'

let currentMode: string | null = null
let tournaments: TourneySummary[] = []
let myId: string = localStorage.getItem('playerId') ?? ''
let currentLobby: LobbyState | null = null

const lobbySocket = new WebSocket(
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`
)

function joinByCodeWithSocket(code?: string) {
  joinByCode(lobbySocket, code)
}
function handleOpen() {
  console.log('[WS] lobby socket open')
}

function handleError(err: Event) {
  console.error('[WS] lobby error', err)
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
    case 'joinedLobby': {
      const { playerId, lobby } = data.payload
      setMyId(playerId)
      localStorage.setItem('playerId', playerId)
      if (lobby) {
        setCurrentLobby(lobby)
        history.pushState({}, '', `/tournament/${lobby.code}`)
        renderLobby(lobby)
      }
      break
    }
    case 'tournamentCreated': {
      const lobby: LobbyState = data.payload
      setMyId(lobby.hostId)
      localStorage.setItem('playerId', lobby.hostId)
      history.pushState({}, '', `/tournament/${lobby.code}`)
      renderLobby(lobby)
      break
    }
    case 'tournamentUpdated': {
      console.log('received data12', data)
      renderLobby(data.payload as LobbyState)
      break
    }
    case 'tournamentList': {
      tournaments = data.payload as TourneySummary[]
      if (window.location.pathname === '/tournament') {
        renderTournamentList(tournaments, joinByCodeWithSocket)
      }
      break
    }
  }
}

lobbySocket.addEventListener('open', handleOpen)
lobbySocket.addEventListener('error', handleError)
lobbySocket.addEventListener('message', handleMessage)


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
    
    document.getElementById('t-lobby-page')!.style.display = 'block'
    return
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
  setupButtons(navigate, lobbySocket, () => currentLobby)
  window.addEventListener('popstate', route)
  route()
})

function setupNavigationButtons() {
  const btnMap: Record<string, string> = {
    'sp-vs-pve-btn': '/game/pve',
    'one-vs-one-btn': '/game/1v1',
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
