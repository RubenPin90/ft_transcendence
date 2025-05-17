import { setCurrentTLobby, getCurrentTLobby, getMyId } from './state.js';
let buttonsInitialized = false;
export function setupButtonsDelegated(navigate, TLobbySocket) {
    if (buttonsInitialized)
        return; // ← …but never used it
    buttonsInitialized = true;
    const lobbyPage = document.getElementById('t-lobby-page');
    if (!lobbyPage)
        return;
    lobbyPage.addEventListener('click', (event) => {
        var _a;
        const target = event.target;
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
                console.log('Unknown button clicked:', target.id);
                break;
        }
    });
}
