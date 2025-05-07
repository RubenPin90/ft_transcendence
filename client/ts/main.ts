import {
  initGameCanvas,
  startGame,
  stopGame,
  setOnGameEnd
} from './game.js'
import type { GameMode } from './game.js'
import {
  renderTournamentList,
  joinByCode,
  TourneySummary
} from './tournament.js'

let currentMode: string | null = null
let tournaments: TourneySummary[] = []
// initialize from storage so we remember across reloads
let myId: string = localStorage.getItem('playerId') ?? ''

const lobbySocket = new WebSocket(
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`
)

interface LobbyState {
  id: string
  code: string
  slots: number
  players: { id: string; name: string; ready: boolean }[]
  hostId: string
}
let currentLobby: LobbyState | null = null

/**
 * Helper that binds the socket so UI code does not need to know about the WS.
 */
function joinByCodeWithSocket(code?: string) {
  joinByCode(lobbySocket, code)
}

/*****************************************************************
 * LOBBY → WEBSOCKET HANDLERS
 *****************************************************************/
lobbySocket.addEventListener('open', () =>
  console.log('[WS] lobby socket open')
)
lobbySocket.addEventListener('error', err =>
  console.error('[WS] lobby error', err)
)
lobbySocket.addEventListener('message', ev => {
  const data = JSON.parse(ev.data)

  switch (data.type) {
    case 'error': {
      const banner = document.getElementById('error-banner')!
      banner.textContent = data.payload.message
      banner.style.display = 'block'
      break
    }

    case 'joinedLobby': {
      const { playerId, lobby } = data.payload         // ← expect both fields
           myId = playerId
      localStorage.setItem('playerId', myId)
           // If the server also included the lobby snapshot, show it immediately.
      // (Most back‑ends do; if yours does not, this is a harmless no‑op and
      // the next “tournamentUpdated” will still refresh the screen.)
      if (lobby) {
        currentLobby = lobby
        history.pushState({}, '', `/tournament/${lobby.code}`)
        renderLobby(lobby)
      }
      break
       }

    case 'tournamentCreated': {
      const lobby: LobbyState = data.payload
      myId = lobby.hostId
      localStorage.setItem('playerId', myId)
      history.pushState({}, '', `/tournament/${lobby.code}`)
      renderLobby(lobby)          // render picks the right page now
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
})

/*****************************************************************
 * GENERIC SPA NAVIGATION
 *****************************************************************/
setOnGameEnd((winnerId: string) => {
  alert(`Player ${winnerId} wins!`)
})

const navigate = (path: string) => {
  if (path === window.location.pathname) return
  history.pushState({}, '', path)
  route()
}

// hide all “pages” then display the one we need
function hideAllPages() {
  [
    'main-menu',
    'profile-page',
    'settings-page',
    'game-container',
    'tournament-page',
    't-lobby-page',
    't-guest-lobby-page' 
  ].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.style.display = 'none'
  })
}

/*****************************************************************
 * ROUTER
 *****************************************************************/
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
    // optionally fetch latest state here if needed
    return
  }

  const mapping: Record<string, string> = {
    '/profile': 'profile-page',
    '/settings': 'settings-page'
  }
  const pageId = mapping[path]
  if (pageId) document.getElementById(pageId)!.style.display = 'block'
  else document.getElementById('main-menu')!.style.display = 'block'
}

/*****************************************************************
 * DOMContentLoaded: wire top-level buttons
 *****************************************************************/
document.addEventListener('DOMContentLoaded', () => {
  const btnMap: Record<string, string> = {
    'sp-vs-pve-btn': '/game/pve',
    'one-vs-one-btn': '/game/1v1',
    'Tournament-btn': '/tournament',
    'settings-btn': '/settings',
    'profile-btn': '/profile'
  }

  Object.entries(btnMap).forEach(([btnId, routePath]) => {
    document.getElementById(btnId)?.addEventListener('click', () =>
      navigate(routePath)
    )
  })

  // tournament lobby buttons
  document.getElementById('t-back-btn')?.addEventListener('click', () =>
    navigate('/')
  )
  document.getElementById('t-create-btn')?.addEventListener('click', () => {
    lobbySocket.send(JSON.stringify({ type: 'createTournament' }))
  })
  document.getElementById('t-copy-code-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText('#' + (currentLobby?.code ?? ''))
  })

  document.getElementById('t-leave-btn')?.addEventListener('click', () => {
    lobbySocket.send(JSON.stringify({ type: 'leaveTournament' }))
    navigate('/tournament')
  })

  document.getElementById('t-ready-btn')?.addEventListener('click', () => {
    lobbySocket.send(JSON.stringify({ type: 'toggleReady' }))
  })

  document.getElementById('t-start-btn')?.addEventListener('click', () => {
    if (currentLobby) {
      lobbySocket.send(
        JSON.stringify({ type: 'startTournament', payload: { id: currentLobby.id } })
      )
    }
  })

  // join-by-code helpers
  const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null
  const codeBtn = document.getElementById('t-code-btn') as HTMLButtonElement | null

  if (codeInput && codeBtn) {
    codeBtn.addEventListener('click', () => joinByCodeWithSocket())
    codeInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') joinByCodeWithSocket()
    })
  }

  window.addEventListener('popstate', route)
  route()
})

/*****************************************************************
 * RENDERS THE LOBBY UI
 *****************************************************************/
function renderLobby(lobby: LobbyState) {
  currentLobby = lobby
  console.log('rendering lobby', lobby)

  const amHost = lobby.hostId === myId
  const me = lobby.players.find(p => p.id === myId)
  const safePlayers = Array.isArray(lobby.players) ? lobby.players : []

  // Check if everyone is ready
  const allReady =
    safePlayers.length === lobby.slots && safePlayers.every(p => p.ready)

  // --- Show only the correct page ---
  hideAllPages()
  const pageId = amHost ? 't-lobby-page' : 't-guest-lobby-page'
  document.getElementById(pageId)!.style.display = 'block'

  // --- Render player table ---
  const table = document.getElementById(amHost ? 't-lobby-table' : 't-guest-table')!
  table.innerHTML = ''
  for (let idx = 0; idx < lobby.slots; idx++) {
    const p = safePlayers[idx]
    const row = document.createElement('div')
    row.className = 'lobby-row'
    row.innerHTML = `
      <span>${p?.name ?? '— empty —'}</span>
      ${p ? `<span class="${p.ready ? 'green-dot' : 'red-dot'}"></span>` : '<span></span>'}
    `
    table.appendChild(row)
  }

  // --- Host view ---
  if (amHost) {
    const shareInput = document.getElementById('t-share-code') as HTMLInputElement
    shareInput.value = '#' + (lobby.code ?? '----')

    const startBtn = document.getElementById('t-start-btn') as HTMLButtonElement
    startBtn.disabled = !allReady
    return
  }

  // --- Guest view ---
  const shareInput = document.getElementById('t-guest-share-code') as HTMLInputElement
  shareInput.value = '#' + (lobby.code ?? '----')

  const readyDot = document.getElementById('t-my-ready-dot') as HTMLSpanElement
  if (me) readyDot.className = me.ready ? 'green-dot' : 'red-dot'

  const status = document.getElementById('t-guest-status')!
  if (!allReady) {
    status.textContent = 'Waiting for players…'
  } else {
    status.textContent = 'Waiting for host to start…'
  }
}
