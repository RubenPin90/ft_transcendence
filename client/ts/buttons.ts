import type { TLobbyState } from './types.js'
import { setCurrentTLobby, getCurrentTLobby, getMyId } from './state.js';

let buttonsInitialized = false;

export function setupButtonsDelegated(
  navigate: (path: string) => void,
  TLobbySocket: WebSocket
) {

  if (buttonsInitialized) return;           // ← …but never used it
  buttonsInitialized = true;


  const lobbyPage = document.getElementById('t-lobby-page');
  if (!lobbyPage) return;

  lobbyPage.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const TLobby = getCurrentTLobby();
    const userId = getMyId();

    switch (target.id) {
      case 't-back-btn':
        navigate('/');
        break;

      case 't-create-btn':
        TLobbySocket.send(JSON.stringify({ type: 'createTournament' }));
        break;

      case 't-copy-code-btn':
        navigator.clipboard.writeText('#' + (TLobby?.code ?? ''));
        break;

      case 't-leave-btn':
        TLobbySocket.send(JSON.stringify({
          type: 'leaveTournament',
          payload: TLobby ? { tournamentId: TLobby.id } : {}
        }));
        if (TLobby) setCurrentTLobby(null);
        navigate('/tournament');
        break;

      case 't-ready-btn':
        TLobbySocket.send(JSON.stringify({
          type: 'toggleReady',
          payload: TLobby ? { tournamentId: TLobby.id, userId } : { userId }
        }));
        break;

      case 't-start-btn':
        if (TLobby) {
          TLobbySocket.send(JSON.stringify({
            type: 'startTournament',
            payload: { id: TLobby.id }
          }));
        }
        break;
      default: 
        console.log('Unknown button clicked:', target.id);
        break;
    }

  });
}

export function setupNavigationButtons(
  navigate: (path: string) => void
) {
  const btnMap: Record<string, string> = {
    'sp-vs-pve-btn': '/game/pve',
    'one-vs-one-btn': '/matchmaking',
    'Tournament-btn': '/tournament',
    'settings-btn': '/settings',
    'profile-btn': '/profile'
  };
  for (const [btnId, routePath] of Object.entries(btnMap)) {
    document.getElementById(btnId)?.addEventListener('click', () => navigate(routePath));
  }
}