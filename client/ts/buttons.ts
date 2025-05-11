// buttons.ts

import type { LobbyState } from './types.js'

export function setupButtons(
  navigate: (path: string) => void,
  lobbySocket: WebSocket,
  getCurrentLobby: () => LobbyState | null
) {
  document.getElementById('t-back-btn')?.addEventListener('click', () =>
    navigate('/')
  )

  document.getElementById('t-create-btn')?.addEventListener('click', () => {
    lobbySocket.send(JSON.stringify({ type: 'createTournament' }))
  })

  document.getElementById('t-copy-code-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText('#' + (getCurrentLobby()?.code ?? ''))
  })

  document.getElementById('t-leave-btn')?.addEventListener('click', () => {
    lobbySocket.send(JSON.stringify({ type: 'leaveTournament' }))
    navigate('/tournament')
  })

  document.getElementById('t-ready-btn')?.addEventListener('click', () => {
    lobbySocket.send(JSON.stringify({ type: 'toggleReady' }))
  })

  document.getElementById('t-start-btn')?.addEventListener('click', () => {
    const lobby = getCurrentLobby()
    if (lobby) {
      lobbySocket.send(
        JSON.stringify({ type: 'startTournament', payload: { id: lobby.id } })
      )
    }
  })
}
