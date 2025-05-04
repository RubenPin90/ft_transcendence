import { initGameCanvas, startGame, stopGame, setOnGameEnd } from './game.js';
/*****************************************************************
 * GLOBAL STATE & WS
 *****************************************************************/
let currentMode = null;
let currentRoomId = null;
// persistent lobby‑level socket (same origin as HTTP)
const lobbySocket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/game`);
lobbySocket.addEventListener('open', () => console.log('[WS] lobby socket open'));
lobbySocket.addEventListener('error', err => console.error('[WS] lobby error', err));
lobbySocket.addEventListener('message', ev => {
    const data = JSON.parse(ev.data);
    if (data.type === 'error') {
        // simple: pop up an alert
        alert(`Error: ${data.payload.message}`);
        // or better: inject into a dedicated error-banner div:
        // const banner = document.getElementById('error-banner');
        // banner!.textContent = data.payload.message;
        // banner!.style.display = 'block';
    }
    // …handle other message types: 'tournamentList', 'joined', etc.
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
    ;
    [
        'main-menu',
        'profile-page',
        'settings-page',
        'game-container',
        'tournament-page'
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
    // ——— TOURNAMENT LOBBY ———————————————————————————
    if (path === '/tournament') {
        document.getElementById('tournament-page').style.display = 'block';
        renderTournamentList(dummyList); // TODO: replace with real data
        return;
    }
    // ——— ACTUAL GAME —————————————————————————————————
    if (path.startsWith('/game')) {
        document.getElementById('game-container').style.display = 'block';
        const mode = path.split('/')[2] || 'pve';
        document.getElementById('game-mode-title').textContent =
            'Mode: ' + mode;
        if (currentMode && currentMode !== mode)
            stopGame();
        currentMode = mode;
        initGameCanvas();
        if (['pve', '1v1',].includes(mode))
            startGame(mode);
        setOnGameEnd(winnerId => {
            stopGame();
            alert(`Game over! Player ${winnerId} wins!`);
        });
        return;
    }
    // ——— STATIC PAGES (profile, settings) —————————————
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
 * DOMContentLoaded: wire top‑level buttons
 *****************************************************************/
document.addEventListener('DOMContentLoaded', () => {
    var _a, _b;
    // mapping main‑menu buttons → routes
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
    // tournament lobby buttons (these elements exist only on that page)
    (_a = document.getElementById('t-back-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => navigate('/'));
    (_b = document.getElementById('t-create-btn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        lobbySocket.send(JSON.stringify({
            type: 'createTournament'
        }));
    });
    // join‑by‑code helpers (input + small button)
    const codeInput = document.getElementById('t-code-input');
    const codeBtn = document.getElementById('t-code-btn');
    if (codeInput && codeBtn) {
        codeBtn.addEventListener('click', () => joinByCode());
        codeInput.addEventListener('keydown', e => {
            if (e.key === 'Enter')
                joinByCode();
        });
    }
    window.addEventListener('popstate', route);
    route();
});
/*****************************************************************
 * joinByCode() — used by both manual entry *and* list buttons
 *****************************************************************/
function joinByCode(codeFromBtn) {
    var _a;
    const codeInput = document.getElementById('t-code-input');
    const code = ((_a = codeFromBtn !== null && codeFromBtn !== void 0 ? codeFromBtn : codeInput === null || codeInput === void 0 ? void 0 : codeInput.value) !== null && _a !== void 0 ? _a : '').trim();
    if (!code) {
        alert('Please enter a tournament code');
        return;
    }
    lobbySocket.send(JSON.stringify({
        type: 'joinByCode',
        payload: { code }
    }));
}
const dummyList = [
    {
        id: 'abc123',
        code: 'ABC123',
        name: 'Tournament 1',
        slots: '6/8',
        joinable: true
    },
    {
        id: 'def456',
        code: 'DEF456',
        name: 'Tournament 2',
        slots: '8/8',
        joinable: false
    },
    {
        id: 'ghi789',
        code: 'GHI789',
        name: 'Tournament 3',
        slots: '7/8',
        joinable: true
    },
    {
        id: 'jkl012',
        code: 'JKL012',
        name: 'Tournament 4',
        slots: '1/8',
        joinable: true
    }
];
function renderTournamentList(list) {
    const box = document.getElementById('tournament-list');
    box.innerHTML = '';
    list.forEach(t => {
        var _a;
        const card = document.createElement('div');
        card.className = 't-card';
        card.innerHTML = `
      <div>
        <div>${t.name}</div>
        <div>${t.slots}</div>
      </div>
      <button class="join-btn" ${t.joinable ? '' : 'disabled'} data-code="${t.code}">
        ${t.joinable ? 'JOIN' : 'FULL'}
      </button>`;
        (_a = card.querySelector('.join-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', e => {
            const btn = e.currentTarget;
            joinByCode(btn.dataset.code);
        });
        box.appendChild(card);
    });
}
