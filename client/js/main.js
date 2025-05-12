var _a;
import { initGameCanvas, startGame, stopGame, setOnGameEnd } from './game.js';
import { renderTournamentList, joinByCode, renderTLobby } from './tournament.js';
import { setupButtons } from './buttons.js';
import { setMyId, setCurrentTLobby, getCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
let currentMode = null;
let tournaments = [];
let myId = (_a = localStorage.getItem('playerId')) !== null && _a !== void 0 ? _a : '';
const TLobbySocket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`);
function joinByCodeWithSocket(code) {
    joinByCode(TLobbySocket, code);
}
function handleOpen() {
    console.log('[WS] TLobby socket open');
}
function handleError(err) {
    console.error('[WS] TLobby error', err);
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
        case 'joinedTLobby': {
            console.log('received data', data);
            const { playerId, TLobby } = data.payload;
            setMyId(playerId);
            localStorage.setItem('playerId', playerId);
            if (TLobby) {
                setCurrentTLobby(TLobby);
                history.pushState({}, '', `/tournament/${TLobby.code}`);
                renderTLobby(TLobby, TLobbySocket);
            }
            break;
        }
        case 'tournamentCreated': {
            const TLobby = data.payload;
            setMyId(TLobby.hostId);
            localStorage.setItem('playerId', TLobby.hostId);
            history.pushState({}, '', `/tournament/${TLobby.code}`);
            renderTLobby(TLobby, TLobbySocket);
            break;
        }
        case 'tournamentUpdated': {
            console.log('received data12', data);
            renderTLobby(data.payload, TLobbySocket);
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
TLobbySocket.addEventListener('open', handleOpen);
TLobbySocket.addEventListener('error', handleError);
TLobbySocket.addEventListener('message', handleMessage);
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
    setupButtons(navigate, TLobbySocket, getCurrentTLobby);
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
