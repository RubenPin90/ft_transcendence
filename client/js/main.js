import { initGameCanvas, startGame, stopGame, setOnGameEnd } from './game.js';
import { renderTournamentList, joinByCode, renderTLobby } from './tournament.js';
import { setupButtonsDelegated } from './buttons.js';
import { setMyId, setCurrentTLobby, getCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
import { setupMatchmakingHandlers } from './matchmaking.js';
import { on, send, getSocket } from './socket.js';
on('error', (msg) => {
    const banner = document.getElementById('error-banner');
    banner.textContent = msg.payload.message;
    banner.style.display = 'block';
});
on('joinedTLobby', (msg) => {
    const { playerId, TLobby } = msg.payload;
    setMyId(playerId);
    localStorage.setItem('playerId', playerId);
    if (TLobby) {
        setCurrentTLobby(TLobby);
        history.pushState({}, '', `/tournament/${TLobby.code}`);
        renderTLobby(TLobby, getSocket());
    }
});
on('tournamentCreated', (msg) => {
    const TLobby = msg.payload;
    setMyId(TLobby.hostId);
    localStorage.setItem('playerId', TLobby.hostId);
    history.pushState({}, '', `/tournament/${TLobby.code}`);
    renderTLobby(TLobby, getSocket());
});
on('tournamentUpdated', (msg) => {
    renderTLobby(msg.payload, getSocket());
});
let tournaments = [];
on('tournamentList', (msg) => {
    tournaments = msg.payload;
    if (window.location.pathname === '/tournament') {
        renderTournamentList(tournaments, joinByCodeWithSocket);
    }
});
on('tLobbyState', (msg) => {
    console.log('tLobbyState', msg);
    const lobby = msg.payload;
    const current = getCurrentTLobby();
    if (current && current.id !== lobby.id)
        return;
    setCurrentTLobby(lobby);
    renderTLobby(lobby, getSocket());
});
on('matchFound', (msg) => {
    const { gameId, mode, userId } = msg.payload;
    queued = false;
    markQueued === null || markQueued === void 0 ? void 0 : markQueued(false);
    localStorage.setItem('currentGameId', gameId);
    localStorage.setItem('playerId', userId);
    navigate(`/game/${mode === 'PVP' || mode === '1v1' ? '1v1' : 'pve'}`);
});
let markQueued;
let currentMode = null;
let queued = false;
function joinByCodeWithSocket(code) {
    joinByCode(getSocket(), code);
}
setOnGameEnd((winnerId) => {
    alert(`Player ${winnerId} wins!`);
});
const navigate = (path) => {
    if (path === window.location.pathname)
        return;
    history.pushState({}, '', path);
    route();
};
function route() {
    const path = window.location.pathname;
    hideAllPages();
    if (path === '/tournament') {
        document.getElementById('tournament-page').style.display = 'block';
        renderTournamentList(tournaments, joinByCodeWithSocket);
        return;
    }
    if (path === '/matchmaking') {
        enterMatchmaking();
        markQueued(true);
        document.getElementById('matchmaking-page').style.display = 'block';
        return;
    }
    if (path.startsWith('/game')) {
        document.getElementById('game-container').style.display = 'block';
        const mode = path.split('/')[2] || 'pve';
        document.getElementById('game-mode-title').textContent =
            'Mode: ' + mode;
        if (currentMode && currentMode !== mode)
            stopGame();
        currentMode = mode;
        initGameCanvas();
        if (['pve', '1v1'].includes(mode))
            startGame(mode);
        setOnGameEnd((winnerId) => {
            stopGame();
            alert(`Game over! Player ${winnerId} wins!`);
        });
        return;
    }
    if (path.startsWith('/tournament/')) {
        document.getElementById('t-lobby-page').style.display = 'block';
        return;
    }
    const mapping = {
        '/profile': 'profile-page',
        '/settings': 'settings-page'
    };
    const pageId = mapping[path];
    if (pageId) {
        document.getElementById(pageId).style.display = 'block';
    }
    else {
        document.getElementById('main-menu').style.display = 'block';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // setupNavigationButtons(navigate);
    setupCodeJoinHandlers();
    setupButtonsDelegated(navigate, getSocket());
    ({ markQueued } = setupMatchmakingHandlers(navigate, getSocket()));
    window.addEventListener('popstate', route);
    route();
});
function enterMatchmaking() {
    if (queued)
        return;
    queued = true;
    send({ type: 'joinQueue', payload: { mode: '1v1' } });
}
function leaveMatchmaking() {
    if (!queued)
        return;
    queued = false;
    send({ type: 'leaveQueue' });
}
function setupCodeJoinHandlers() {
    const codeInput = document.getElementById('t-code-input');
    const codeBtn = document.getElementById('t-code-btn');
    if (!codeInput || !codeBtn)
        return;
    codeBtn.addEventListener('click', () => joinByCodeWithSocket());
    codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            joinByCodeWithSocket();
    });
}
