import type { TLobbyState } from './types.js'
import { setCurrentTLobby, getCurrentTLobby, getMyId } from './state.js';

let buttonsInitialized = false;

export function setupButtons(
  navigate: (path: string) => void,
  TLobbySocket: WebSocket
) {
  // Prevent double initialization
  if (buttonsInitialized) return;
  buttonsInitialized = true;

  // Back button
  document.getElementById('t-back-btn')?.addEventListener('click', () => navigate('/'));

  // Create Tournament
  document.getElementById('t-create-btn')?.addEventListener('click', () => {
    TLobbySocket.send(JSON.stringify({ type: 'createTournament' }));
  });

  // Copy Code
  document.getElementById('t-copy-code-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText('#' + (getCurrentTLobby()?.code ?? ''));
  });

  // Leave Tournament
  document.getElementById('t-leave-btn')?.addEventListener('click', () => {
    const TLobby = getCurrentTLobby();
    TLobbySocket.send(
      JSON.stringify({ type: 'leaveTournament', payload: TLobby ? { tournamentId: TLobby.id } : {} })
    );
    if (TLobby) setCurrentTLobby(null);
    navigate('/tournament');
  });

  // Toggle Ready Button (single listener)
  document.getElementById('t-ready-btn')?.addEventListener('click', () => {
    const TLobby = getCurrentTLobby();
    const userId = getMyId();
    TLobbySocket.send(
      JSON.stringify({
        type: 'toggleReady',
        payload: TLobby ? { tournamentId: TLobby.id, userId } : { userId }
      })
    );
  });

  // Start Tournament
  document.getElementById('t-start-btn')?.addEventListener('click', () => {
    const TLobby = getCurrentTLobby();
    if (TLobby) {
      TLobbySocket.send(
        JSON.stringify({ type: 'startTournament', payload: { id: TLobby.id } })
      );
    }
  });
}
