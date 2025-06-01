var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { initGameCanvas, startGame, stopGame, setOnGameEnd, } from './game.js';
import { renderTournamentList, joinByCode, renderTLobby, renderBracketOverlay } from './tournament.js';
import { setupButtonsDelegated } from './buttons.js';
import { setMyId, setCurrentTLobby, getCurrentTLobby } from './state.js';
import { hideAllPages } from './helpers.js';
import { setupMatchmakingHandlers } from './matchmaking.js';
import { on, send, getSocket } from './socket.js';
const socket = getSocket();
let currentRoomId = null;
let userId = null;
let currentMatch = null;
on('welcome', (msg) => {
    const { userId } = msg.payload;
    localStorage.setItem('playerId', userId);
    socket.userId = userId;
});
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
        renderTLobby(TLobby, socket);
    }
});
on('matchAssigned', (msg) => {
    var _a;
    const { tournamentId, matchId, players } = msg.payload;
    const myId = (_a = localStorage.getItem('playerId')) !== null && _a !== void 0 ? _a : socket.userId;
    const me = players.find(p => p.id === myId);
    const rival = players.find(p => p.id !== myId);
    if (!me || !rival)
        return;
    localStorage.setItem('currentGameId', matchId);
    currentRoomId = matchId;
    setTimeout(() => {
        send({ type: 'joinMatchRoom', payload: { tournamentId, matchId } });
        navigate('/game/1v1');
    }, 3000);
});
on('tournamentBracketMsg', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const { tournamentId, rounds } = msg.payload;
    const normalized = Array.isArray(rounds[0])
        ? rounds
        : [rounds];
    renderBracketOverlay(normalized);
    if (!amHost())
        return;
    yield new Promise(r => setTimeout(r, 700));
    const firstRound = normalized[0];
    const firstReal = firstRound.find(m => m.players.filter(p => p && !('pendingMatchId' in p)).length === 2);
    if (firstReal) {
        const [A, B] = firstReal.players;
        yield showVersusOverlay(A.name, B.name);
    }
    send({
        type: 'beginRound',
        payload: { tournamentId }
    });
}));
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
        return;
    setCurrentTLobby(lobby);
    renderTLobby(lobby, socket);
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
function showVersusOverlay(left, right) {
    return new Promise((resolve) => {
        let el = document.getElementById('vs-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'vs-overlay';
            el.style.cssText = `
        position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
        background:rgba(0,0,0,.8); color:#fff; font:700 3rem/1 sans-serif; z-index:9999;
        text-align:center; opacity:0; transition:opacity .4s;
      `;
            document.body.appendChild(el);
        }
        el.textContent = `${left}  vs  ${right}`;
        requestAnimationFrame(() => (el.style.opacity = '1'));
        const SHOW_MS = 2500;
        const HIDE_MS = 400;
        const hideTimer = setTimeout(() => {
            el.style.opacity = '0';
        }, SHOW_MS);
        const onEnd = () => {
            cleanup();
            resolve();
        };
        el.addEventListener('transitionend', onEnd, { once: true });
        const fallbackTimer = setTimeout(() => {
            cleanup();
            resolve();
        }, SHOW_MS + HIDE_MS + 50);
        function cleanup() {
            clearTimeout(hideTimer);
            clearTimeout(fallbackTimer);
            el === null || el === void 0 ? void 0 : el.removeEventListener('transitionend', onEnd);
            el === null || el === void 0 ? void 0 : el.remove();
        }
    });
}
function joinByCodeWithSocket(code) {
    joinByCode(socket, code);
}
setOnGameEnd((winnerId) => {
    alert(`Player ${winnerId} wins!`);
});
const navigate = (path) => {
    const samePath = path === window.location.pathname;
    if (!samePath) {
        history.pushState({}, '', path);
    }
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
function amHost() {
    var _a;
    const lobby = getCurrentTLobby();
    const myId = (_a = localStorage.getItem('playerId')) !== null && _a !== void 0 ? _a : socket.userId;
    return (lobby === null || lobby === void 0 ? void 0 : lobby.hostId) === myId;
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
