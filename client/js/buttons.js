import { setCurrentTLobby, getCurrentTLobby, getMyId } from './state.js';
let buttonsInitialized = false;
export function setupButtons(navigate, TLobbySocket) {
    var _a, _b, _c, _d, _e, _f;
    // Prevent double initialization
    if (buttonsInitialized)
        return;
    buttonsInitialized = true;
    // Back button
    (_a = document.getElementById('t-back-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => navigate('/'));
    // Create Tournament
    (_b = document.getElementById('t-create-btn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        TLobbySocket.send(JSON.stringify({ type: 'createTournament' }));
    });
    // Copy Code
    (_c = document.getElementById('t-copy-code-btn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
        var _a, _b;
        navigator.clipboard.writeText('#' + ((_b = (_a = getCurrentTLobby()) === null || _a === void 0 ? void 0 : _a.code) !== null && _b !== void 0 ? _b : ''));
    });
    // Leave Tournament
    (_d = document.getElementById('t-leave-btn')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
        const TLobby = getCurrentTLobby();
        TLobbySocket.send(JSON.stringify({ type: 'leaveTournament', payload: TLobby ? { tournamentId: TLobby.id } : {} }));
        if (TLobby)
            setCurrentTLobby(null);
        navigate('/tournament');
    });
    // Toggle Ready Button (single listener)
    (_e = document.getElementById('t-ready-btn')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
        const TLobby = getCurrentTLobby();
        const userId = getMyId();
        TLobbySocket.send(JSON.stringify({
            type: 'toggleReady',
            payload: TLobby ? { tournamentId: TLobby.id, userId } : { userId }
        }));
    });
    // Start Tournament
    (_f = document.getElementById('t-start-btn')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
        const TLobby = getCurrentTLobby();
        if (TLobby) {
            TLobbySocket.send(JSON.stringify({ type: 'startTournament', payload: { id: TLobby.id } }));
        }
    });
}
