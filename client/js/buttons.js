// buttons.ts
export function setupButtons(navigate, lobbySocket, getCurrentLobby) {
    var _a, _b, _c, _d, _e, _f;
    (_a = document.getElementById('t-back-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => navigate('/'));
    (_b = document.getElementById('t-create-btn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        lobbySocket.send(JSON.stringify({ type: 'createTournament' }));
    });
    (_c = document.getElementById('t-copy-code-btn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
        var _a, _b;
        navigator.clipboard.writeText('#' + ((_b = (_a = getCurrentLobby()) === null || _a === void 0 ? void 0 : _a.code) !== null && _b !== void 0 ? _b : ''));
    });
    (_d = document.getElementById('t-leave-btn')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
        lobbySocket.send(JSON.stringify({ type: 'leaveTournament' }));
        navigate('/tournament');
    });
    (_e = document.getElementById('t-ready-btn')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
        lobbySocket.send(JSON.stringify({ type: 'toggleReady' }));
    });
    (_f = document.getElementById('t-start-btn')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
        const lobby = getCurrentLobby();
        if (lobby) {
            lobbySocket.send(JSON.stringify({ type: 'startTournament', payload: { id: lobby.id } }));
        }
    });
}
