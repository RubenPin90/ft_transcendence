import { setCurrentTLobby, getCurrentTLobby, getMyId } from './state.js';
let buttonsInitialized = false;
export function setupButtonsDelegated(navigate, TLobbySocket) {
    if (buttonsInitialized)
        return;
    buttonsInitialized = true;
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
        mainMenu.addEventListener('click', (event) => {
            const target = event.target;
            switch (target.id) {
                case 'sp-vs-pve-btn':
                    navigate('/game/pve');
                    break;
                case 'one-vs-one-btn':
                    navigate('/matchmaking');
                    break;
                case 'Tournament-btn':
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
            var _a;
            const target = event.target;
            const TLobby = getCurrentTLobby();
            const userId = getMyId();
            switch (target.id) {
                case 't-back-btn':
                    navigate('/');
                    break;
                case 't-copy-code-btn':
                    navigator.clipboard.writeText('#' + ((_a = TLobby === null || TLobby === void 0 ? void 0 : TLobby.code) !== null && _a !== void 0 ? _a : ''));
                    break;
                case 't-leave-btn':
                    TLobbySocket.send(JSON.stringify({
                        type: 'leaveTournament',
                        payload: TLobby ? { tournamentId: TLobby.id } : {}
                    }));
                    if (TLobby)
                        setCurrentTLobby(null);
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
                    break;
            }
        });
    }
    const tournamentPage = document.getElementById('tournament-page');
    if (tournamentPage) {
        tournamentPage.addEventListener('click', (event) => {
            const target = event.target;
            switch (target.id) {
                case 't-create-btn':
                    TLobbySocket.send(JSON.stringify({ type: 'createTournament' }));
                    break;
                case 't-code-btn':
                    const codeInput = document.getElementById('t-code-input');
                    const code = codeInput === null || codeInput === void 0 ? void 0 : codeInput.value.trim();
                    TLobbySocket.send(JSON.stringify({ type: 'joinTournamentByCode', payload: { code } }));
                    break;
                default:
                    break;
            }
        });
    }
}
