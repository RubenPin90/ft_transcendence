import type { TLobbyState } from './types.js';
import { setCurrentTLobby, getCurrentTLobby, getMyId } from './state.js';

let buttonsInitialized = false;

export function setupButtonsDelegated(
  navigate: (path: string) => void,
  TLobbySocket: WebSocket
) {
  if (buttonsInitialized) return;
  buttonsInitialized = true;

  const mainMenu = document.getElementById('main-menu');
  if (mainMenu) {
    mainMenu.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      switch (target.id) {
        case 'sp-vs-pve-btn':
          navigate('/game/pve');
          break;

        case 'one-vs-one-btn':
          navigate('/matchmaking');
          break;

        case 'tournament-btn':
          navigate('/tournament');
          break;

        case 'settings-btn':
          navigate('/settings');
          break;

        case 'profile-btn':
          navigate('/profile');
          break;

        default:
          break;
      }
    });
  }

  const lobbyPage = document.getElementById('t-lobby-page');
  if (lobbyPage) {
    lobbyPage.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const TLobby = getCurrentTLobby();
      const userId = getMyId();

      switch (target.id) {
        case 't-back-btn':
          navigate('/');
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
              type: 'generateBracket',
              payload: { tournamentId: TLobby.id }
            }));
            (document.getElementById('t-start-btn') as HTMLButtonElement).disabled = true;
          }
          break;

        default:
          break;
      }
    });
  }

  const tournamentPage = document.getElementById('tournament-page');
  if (tournamentPage) {
    tournamentPage.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;

      switch (target.id) {
        case 't-create-btn':
          TLobbySocket.send(JSON.stringify({ type: 'createTournament' }));
          break;

        case 't-code-btn':
          const codeInput = document.getElementById('t-code-input') as HTMLInputElement | null;
          const code = codeInput?.value.trim();
          TLobbySocket.send(JSON.stringify({ type: 'joinTournamentByCode', payload: { code } }));
          break;

        default:
          break;
      }
    });
  }
}
