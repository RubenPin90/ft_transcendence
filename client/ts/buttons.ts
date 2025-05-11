// buttons.ts

import type { TLobbyState } from './types.js'
import { setCurrentTLobby } from './state.js';

export function setupButtons(
  navigate: (path: string) => void,
  TLobbySocket: WebSocket,
  getCurrentTLobby: () => TLobbyState | null
) {
  document.getElementById('t-back-btn')?.addEventListener('click', () =>
    navigate('/')
  )

  document.getElementById('t-create-btn')?.addEventListener('click', () => {
    TLobbySocket.send(JSON.stringify({ type: 'createTournament' }))
  })

  document.getElementById('t-copy-code-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText('#' + (getCurrentTLobby()?.code ?? ''))
  })

  document.getElementById('t-leave-btn')?.addEventListener('click', () => {
    const TLobby = getCurrentTLobby();                 // type: TLobbyState | null
  
    TLobbySocket.send(
      JSON.stringify({
        type: 'leaveTournament',
        payload: TLobby ? { tournamentId: TLobby.id } : {},   // ← safe ternary
      }),
    );
  
    if (TLobby) setCurrentTLobby(null);                // clear only if it existed
    navigate('/tournament');
  });

  document.getElementById('t-ready-btn')?.addEventListener('click', () => {
    const TLobby = getCurrentTLobby()
    TLobbySocket.send(JSON.stringify({ type: 'toggleReady', payload: TLobby ? {tournamentId: TLobby.id} : {}}))
  })

  document.getElementById('t-start-btn')?.addEventListener('click', () => {
    const TLobby = getCurrentTLobby()
    if (TLobby) {
      TLobbySocket.send(
        JSON.stringify({ type: 'startTournament', payload: { id: TLobby.id } })
      )
    }
  })
}
