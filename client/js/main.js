var _a;
import { initGameCanvas, startGame, stopGame, setOnGameEnd } from './game.js';
import { renderTournamentList, joinByCode } from './tournament.js';
let currentMode = null;
let tournaments = [];
// initialize from storage so we remember across reloads
let myId = (_a = localStorage.getItem('playerId')) !== null && _a !== void 0 ? _a : '';
const lobbySocket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`);
let currentLobby = null;
/**
 * Helper that binds the socket so UI code does not need to know about the WS.
 */
function joinByCodeWithSocket(code) {
    joinByCode(lobbySocket, code);
}
/*****************************************************************
 * LOBBY → WEBSOCKET HANDLERS
 *****************************************************************/
lobbySocket.addEventListener('open', () => console.log('[WS] lobby socket open'));
lobbySocket.addEventListener('error', err => console.error('[WS] lobby error', err));
lobbySocket.addEventListener('message', ev => {
    const data = JSON.parse(ev.data);
    switch (data.type) {
        case 'error': {
            const banner = document.getElementById('error-banner');
            banner.textContent = data.payload.message;
            banner.style.display = 'block';
            break;
        }
        case 'joinedLobby': {
            const { playerId, lobby } = data.payload; // ← expect both fields
            myId = playerId;
            localStorage.setItem('playerId', myId);
            // If the server also included the lobby snapshot, show it immediately.
            // (Most back‑ends do; if yours does not, this is a harmless no‑op and
            // the next “tournamentUpdated” will still refresh the screen.)
            if (lobby) {
                currentLobby = lobby;
                history.pushState({}, '', `/tournament/${lobby.code}`);
                renderLobby(lobby);
            }
            break;
        }
        case 'tournamentCreated': {
            const lobby = data.payload;
            myId = lobby.hostId;
            localStorage.setItem('playerId', myId);
            history.pushState({}, '', `/tournament/${lobby.code}`);
            renderLobby(lobby); // render picks the right page now
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
});
/*****************************************************************
 * GENERIC SPA NAVIGATION
 *****************************************************************/
setOnGameEnd((winnerId) => {
    alert(`Player ${winnerId} wins!`);
});
const navigate = (path) => {
    if (path === window.location.pathname)
        return;
    history.pushState({}, '', path);
    route();
};
// hide all “pages” then display the one we need
function hideAllPages() {
    [
        'main-menu',
        'profile-page',
        'settings-page',
        'game-container',
        'tournament-page',
        't-lobby-page',
        't-guest-lobby-page'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el)
            el.style.display = 'none';
    });
}
/*****************************************************************
 * ROUTER
 *****************************************************************/
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
        // optionally fetch latest state here if needed
        return;
    }
    const mapping = {
        '/profile': 'profile-page',
        '/settings': 'settings-page'
    };
    const pageId = mapping[path];
    if (pageId)
        document.getElementById(pageId).style.display = 'block';
    else
        document.getElementById('main-menu').style.display = 'block';
}
/*****************************************************************
 * DOMContentLoaded: wire top-level buttons
 *****************************************************************/
document.addEventListener('DOMContentLoaded', () => {
    var _a, _b, _c, _d, _e, _f;
    const btnMap = {
        'sp-vs-pve-btn': '/game/pve',
        'one-vs-one-btn': '/game/1v1',
        'Tournament-btn': '/tournament',
        'settings-btn': '/settings',
        'profile-btn': '/profile'
    };
    Object.entries(btnMap).forEach(([btnId, routePath]) => {
        var _a;
        (_a = document.getElementById(btnId)) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => navigate(routePath));
    });
    // tournament lobby buttons
    (_a = document.getElementById('t-back-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => navigate('/'));
    (_b = document.getElementById('t-create-btn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        lobbySocket.send(JSON.stringify({ type: 'createTournament' }));
    });
    (_c = document.getElementById('t-copy-code-btn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
        var _a;
        navigator.clipboard.writeText('#' + ((_a = currentLobby === null || currentLobby === void 0 ? void 0 : currentLobby.code) !== null && _a !== void 0 ? _a : ''));
    });
    (_d = document.getElementById('t-leave-btn')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
        lobbySocket.send(JSON.stringify({ type: 'leaveTournament' }));
        navigate('/tournament');
    });
    (_e = document.getElementById('t-ready-btn')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
        lobbySocket.send(JSON.stringify({ type: 'toggleReady' }));
    });
    (_f = document.getElementById('t-start-btn')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
        if (currentLobby) {
            lobbySocket.send(JSON.stringify({ type: 'startTournament', payload: { id: currentLobby.id } }));
        }
    });
    // join-by-code helpers
    const codeInput = document.getElementById('t-code-input');
    const codeBtn = document.getElementById('t-code-btn');
    if (codeInput && codeBtn) {
        codeBtn.addEventListener('click', () => joinByCodeWithSocket());
        codeInput.addEventListener('keydown', e => {
            if (e.key === 'Enter')
                joinByCodeWithSocket();
        });
    }
    window.addEventListener('popstate', route);
    route();
});
/*****************************************************************
 * RENDERS THE LOBBY UI
 *****************************************************************/
function renderLobby(lobby) {
    var _a, _b, _c;
    currentLobby = lobby;
    console.log('rendering lobby', lobby);
    const amHost = lobby.hostId === myId;
    const me = lobby.players.find(p => p.id === myId);
    const safePlayers = Array.isArray(lobby.players) ? lobby.players : [];
    // Check if everyone is ready
    const allReady = safePlayers.length === lobby.slots && safePlayers.every(p => p.ready);
    // --- Show only the correct page ---
    hideAllPages();
    const pageId = amHost ? 't-lobby-page' : 't-guest-lobby-page';
    document.getElementById(pageId).style.display = 'block';
    // --- Render player table ---
    const table = document.getElementById(amHost ? 't-lobby-table' : 't-guest-table');
    table.innerHTML = '';
    for (let idx = 0; idx < lobby.slots; idx++) {
        const p = safePlayers[idx];
        const row = document.createElement('div');
        row.className = 'lobby-row';
        row.innerHTML = `
      <span>${(_a = p === null || p === void 0 ? void 0 : p.name) !== null && _a !== void 0 ? _a : '— empty —'}</span>
      ${p ? `<span class="${p.ready ? 'green-dot' : 'red-dot'}"></span>` : '<span></span>'}
    `;
        table.appendChild(row);
    }
    // --- Host view ---
    if (amHost) {
        const shareInput = document.getElementById('t-share-code');
        shareInput.value = '#' + ((_b = lobby.code) !== null && _b !== void 0 ? _b : '----');
        const startBtn = document.getElementById('t-start-btn');
        startBtn.disabled = !allReady;
        return;
    }
    // --- Guest view ---
    const shareInput = document.getElementById('t-guest-share-code');
    shareInput.value = '#' + ((_c = lobby.code) !== null && _c !== void 0 ? _c : '----');
    const readyDot = document.getElementById('t-my-ready-dot');
    if (me)
        readyDot.className = me.ready ? 'green-dot' : 'red-dot';
    const status = document.getElementById('t-guest-status');
    if (!allReady) {
        status.textContent = 'Waiting for players…';
    }
    else {
        status.textContent = 'Waiting for host to start…';
    }
}
