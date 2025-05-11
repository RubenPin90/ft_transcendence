var _a;
import { initGameCanvas, startGame, stopGame, setOnGameEnd } from './game.js';
import { renderTournamentList, joinByCode, renderLobby } from './tournament.js';
import { setupButtons } from './buttons.js';
import { setMyId, setCurrentLobby } from './state.js';
import { hideAllPages } from './helpers.js';
let currentMode = null;
let tournaments = [];
let myId = (_a = localStorage.getItem('playerId')) !== null && _a !== void 0 ? _a : '';
let currentLobby = null;
const lobbySocket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`);
function joinByCodeWithSocket(code) {
    joinByCode(lobbySocket, code);
}
function handleOpen() {
    console.log('[WS] lobby socket open');
}
function handleError(err) {
    console.error('[WS] lobby error', err);
}
function handleMessage(ev) {
    const data = JSON.parse(ev.data);
    switch (data.type) {
        case 'error': {
            const banner = document.getElementById('error-banner');
            banner.textContent = data.payload.message;
            banner.style.display = 'block';
            break;
        }
        case 'joinedLobby': {
            const { playerId, lobby } = data.payload;
            setMyId(playerId);
            localStorage.setItem('playerId', playerId);
            if (lobby) {
                setCurrentLobby(lobby);
                history.pushState({}, '', `/tournament/${lobby.code}`);
                renderLobby(lobby);
            }
            break;
        }
        case 'tournamentCreated': {
            const lobby = data.payload;
            setMyId(lobby.hostId);
            localStorage.setItem('playerId', lobby.hostId);
            history.pushState({}, '', `/tournament/${lobby.code}`);
            renderLobby(lobby);
            break;
        }
        case 'tournamentUpdated': {
            console.log('received data12', data);
            renderLobby(data.payload);
            break;
        }
        case 'tournamentList': {
            tournaments = data.payload;
            if (window.location.pathname === '/tournament') {
                renderTournamentList(tournaments, joinByCodeWithSocket);
            }
            break;
        }
    }
}
lobbySocket.addEventListener('open', handleOpen);
lobbySocket.addEventListener('error', handleError);
lobbySocket.addEventListener('message', handleMessage);
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
        setOnGameEnd(winnerId => {
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
        console.log('showing page:', pageId, document.getElementById(pageId));
        document.getElementById(pageId).style.display = 'block';
    }
    else {
        console.log('showing page:', pageId, document.getElementById(pageId));
        document.getElementById('main-menu').style.display = 'block';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    setupNavigationButtons();
    setupCodeJoinHandlers();
    setupButtons(navigate, lobbySocket, () => currentLobby);
    window.addEventListener('popstate', route);
    route();
});
function setupNavigationButtons() {
    var _a;
    const btnMap = {
        'sp-vs-pve-btn': '/game/pve',
        'one-vs-one-btn': '/game/1v1',
        'Tournament-btn': '/tournament',
        'settings-btn': '/settings',
        'profile-btn': '/profile'
    };
    for (const [btnId, routePath] of Object.entries(btnMap)) {
        (_a = document.getElementById(btnId)) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => navigate(routePath));
    }
}
function setupCodeJoinHandlers() {
    const codeInput = document.getElementById('t-code-input');
    const codeBtn = document.getElementById('t-code-btn');
    if (!codeInput || !codeBtn)
        return;
    codeBtn.addEventListener('click', () => joinByCodeWithSocket());
    codeInput.addEventListener('keydown', e => {
        if (e.key === 'Enter')
            joinByCodeWithSocket();
    });
}
