// main.ts — fixed to keep the original `on()` event-bus style
import { initGameCanvas, startGame, stopGame, setOnGameEnd } from './game.js';
import { renderTournamentList, joinByCode, renderTLobby, renderBracketOverlay } from './tournament.js';
import { setupButtonsDelegated } from './buttons.js';
import { setMyId, setCurrentTLobby, getCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
import { setupMatchmakingHandlers } from './matchmaking.js';
import { on, send, getSocket } from './socket.js';
// ────────────────────────────────────────────────────────────
//  1.  guarantee we have a socket right away and recover userId
// ────────────────────────────────────────────────────────────
const socket = getSocket(); // getSocket() now builds WS with stored playerId as sub-protocol
on('welcome', (msg) => {
    // server confirms what userId it finally assigned to this tab
    const { userId } = msg.payload;
    localStorage.setItem('playerId', userId);
    socket.userId = userId; // keep a live copy on the WS object
});
// ────────────────────────────────────────────────────────────
//  2.  generic error banner
// ────────────────────────────────────────────────────────────
on('error', (msg) => {
    const banner = document.getElementById('error-banner');
    banner.textContent = msg.payload.message;
    banner.style.display = 'block';
});
// ────────────────────────────────────────────────────────────
//  3.  TLobby and tournament events – unchanged API
// ────────────────────────────────────────────────────────────
on('joinedTLobby', (msg) => {
    const { playerId, TLobby } = msg.payload;
    setMyId(playerId);
    localStorage.setItem('playerId', playerId);
    if (TLobby) {
        setCurrentTLobby(TLobby);
        history.pushState({}, '', `/tournament/${TLobby.code}`);
        renderTLobby(TLobby, socket);
    }
});
on('tournamentBracketMsg', (msg) => {
    renderBracketOverlay(msg.payload.rounds);
});
on('tournamentCreated', (msg) => {
    const TLobby = msg.payload;
    setMyId(TLobby.hostId);
    localStorage.setItem('playerId', TLobby.hostId);
    history.pushState({}, '', `/tournament/${TLobby.code}`);
    renderTLobby(TLobby, socket);
});
on('tournamentUpdated', (msg) => {
    renderTLobby(msg.payload, socket);
});
let tournaments = [];
on('tournamentList', (msg) => {
    tournaments = msg.payload;
    if (window.location.pathname === '/tournament') {
        renderTournamentList(tournaments, joinByCodeWithSocket);
    }
});
on('tLobbyState', (msg) => {
    const lobby = msg.payload;
    const current = getCurrentTLobby();
    if (current && current.id !== lobby.id)
        return; // ignore lobbies that are not ours
    setCurrentTLobby(lobby);
    renderTLobby(lobby, socket);
});
// ────────────────────────────────────────────────────────────
//  4.  Generic matchmaking & game-page transitions
// ────────────────────────────────────────────────────────────
on('matchFound', (msg) => {
    const { gameId, mode, userId } = msg.payload;
    queued = false;
    markQueued === null || markQueued === void 0 ? void 0 : markQueued(false);
    localStorage.setItem('currentGameId', gameId);
    localStorage.setItem('playerId', userId);
    navigate(`/game/${mode === 'PVP' || mode === '1v1' ? '1v1' : 'pve'}`);
});
on('matchAssigned', (msg) => {
    var _a;
    const { tournamentId, matchId, players } = msg.payload;
    // fall back to the freshly received socket.userId if LS is empty (first load)
    const myId = (_a = localStorage.getItem('playerId')) !== null && _a !== void 0 ? _a : socket.userId;
    const me = players.find(p => p.id === myId);
    const rival = players.find(p => p.id !== myId);
    if (!me || !rival)
        return;
    showVersusOverlay(me.name, rival.name);
    send({ type: 'joinMatchRoom', payload: { tournamentId, matchId } });
    setTimeout(() => {
        localStorage.setItem('currentGameId', matchId);
        navigate('/game/1v1');
    }, 3000);
});
// ────────────────────────────────────────────────────────────
//  5.  UI helpers & routing (original code, lightly trimmed)
// ────────────────────────────────────────────────────────────
let markQueued;
let currentMode = null;
let queued = false;
function showVersusOverlay(left, right) {
    let el = document.getElementById('vs-overlay');
    if (!el) {
        el = document.createElement('div');
        el.id = 'vs-overlay';
        el.style.cssText = `
      position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,.8);color:#fff;font:700 3rem sans-serif;z-index:9999;
      text-align:center;`;
        document.body.appendChild(el);
    }
    el.textContent = `${left}  vs  ${right}`;
    el.style.opacity = '1';
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 2500);
    setTimeout(() => { el.remove(); }, 3000);
}
function joinByCodeWithSocket(code) {
    joinByCode(socket, code);
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
        document.getElementById('game-mode-title').textContent = 'Mode: ' + mode;
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
    const mapping = { '/profile': 'profile-page', '/settings': 'settings-page' };
    const pageId = mapping[path];
    if (pageId) {
        document.getElementById(pageId).style.display = 'block';
    }
    else {
        document.getElementById('main-menu').style.display = 'block';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    setupCodeJoinHandlers();
    setupButtonsDelegated(navigate, socket);
    ({ markQueued } = setupMatchmakingHandlers(navigate, socket));
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
