import type { LobbyState } from './types.js'
import { getMyId, setCurrentLobby } from './state.js'
import { hideAllPages } from './helpers.js'

export interface TourneySummary {
    id: string
    code: string
    name: string
    slots: string
    joinable: boolean
  }
  export function joinByCode(socket: WebSocket, codeFromBtn?: string) {
    const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null
    const code = (codeFromBtn ?? codeInput?.value ?? '').trim()
  
    if (!code) {
      alert('Please enter a tournament code')
      return
    }
  
    socket.send(
      JSON.stringify({
        type: 'joinByCode',
        payload: { code }
      })
    )
  }

  export function renderTournamentList(
    list: TourneySummary[],
    onJoin: (code: string) => void
  ) {
    if (!Array.isArray(list)) return
    const box = document.getElementById('tournament-list')!
    box.innerHTML = ''
  
    list.forEach(t => {
      const card = document.createElement('div')
      card.className = 't-card'
      card.innerHTML = `
        <div>
          <div>${t.name}</div>
          <div>${t.slots}</div>
        </div>
        <button class="join-btn" ${t.joinable ? '' : 'disabled'} data-code="${t.code}">
          ${t.joinable ? 'JOIN' : 'FULL'}
        </button>`
  
      card.querySelector<HTMLButtonElement>('.join-btn')?.addEventListener('click', e => {
        const btn = e.currentTarget as HTMLButtonElement
        if (btn.disabled) return
        onJoin(btn.dataset.code!)
      })
  
      box.appendChild(card)
    })
  }


  export function renderLobby(lobby: LobbyState) {
    setCurrentLobby(lobby)
    console.log('rendering lobby', lobby)
  
    const myId = getMyId()
    const amHost = lobby.hostId === myId
    console.log('amHost', amHost)
    console.log('myId', myId)
    console.log('lobby', lobby)
    const me = lobby.players.find(p => p.id === myId)
    setCurrentLobby(lobby)

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
    if (amHost === true) {
      const shareInput = document.getElementById('t-share-code') as HTMLInputElement
      shareInput.value = '#' + (lobby.code ?? '----')
  
      const startBtn = document.getElementById('t-start-btn') as HTMLButtonElement
      startBtn.disabled = !allReady
      return
    }
    else {
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
  }
  
  