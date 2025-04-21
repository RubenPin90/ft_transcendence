import {
  initGameCanvas,
  startGame,
  stopGame,
  setOnGameEnd
} from './game.js'
import type { GameMode } from './game.js' // вот это добавь

const USER_ID = `cli_${Math.floor(Math.random() * 9999)}`
let currentMode: string | null = null

setOnGameEnd((winnerId: string) => {
  alert(`Player ${winnerId} wins!`)
})

const navigate = (path: string) => {
  if (path === window.location.pathname) return
  history.pushState({}, '', path)
  console.log('Navigating to:', path)
  route()
}

function route() {
  const path = window.location.pathname
  hideAllPages()

  if (path.startsWith('/game')) {
    document.getElementById('game-container')!.style.display = 'block'
    const mode = path.split('/')[2] || 'pve'
    document.getElementById('game-mode-title')!.textContent = 'Mode: ' + mode

    if (currentMode && currentMode !== mode) {
      stopGame()
    }
    currentMode = mode

    initGameCanvas()
    if (['pve', '1v1', 'Customgame'].includes(mode)) {
      startGame(mode as GameMode)
    }

    setOnGameEnd((winnerId: string) => {
      stopGame()
      alert(`Game over! Player ${winnerId} wins!`)
    })
    return
  }

  const mapping: Record<string, string> = {
    '/profile': 'profile-page',
    '/settings': 'settings-page'
  }
  const pageId = mapping[path]
  if (pageId) {
    document.getElementById(pageId)!.style.display = 'block'
  } else {
    document.getElementById('main-menu')!.style.display = 'block'
  }
}

function hideAllPages() {
  ['main-menu', 'profile-page', 'settings-page', 'game-container'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.style.display = 'none'
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const btnMap: Record<string, string> = {
    'sp-vs-pve-btn': '/game/pve',
    'one-vs-one-btn': '/game/1v1',
    'Customgame-btn': '/game/Customgame'
  }

  Object.entries(btnMap).forEach(([btnId, routePath]: [string, string]) => {
    document.getElementById(btnId)?.addEventListener('click', () => navigate(routePath))
  })

  window.addEventListener('popstate', route)
  route()
})
