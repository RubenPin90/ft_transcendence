import { initGameCanvas, startGame, stopGame, setOnGameEnd } from './game.js';
let currentMode = null;
let currentRoomId = null;
setOnGameEnd((winnerId) => {
    alert(`Player ${winnerId} wins!`);
});
const navigate = (path) => {
    if (path === window.location.pathname)
        return;
    history.pushState({}, '', path);
    console.log('Navigating to:', path);
    route();
};
function route() {
    const path = window.location.pathname;
    hideAllPages();
    if (path.startsWith('/game')) {
        document.getElementById('game-container').style.display = 'block';
        const mode = path.split('/')[2] || 'pve';
        document.getElementById('game-mode-title').textContent = 'Mode: ' + mode;
        if (currentMode && currentMode !== mode) {
            stopGame();
        }
        currentMode = mode;
        initGameCanvas();
        if (['pve', '1v1', 'Tournament'].includes(mode)) {
            startGame(mode);
        }
        setOnGameEnd((winnerId) => {
            stopGame();
            alert(`Game over! Player ${winnerId} wins!`);
        });
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
function hideAllPages() {
    ['main-menu', 'profile-page', 'settings-page', 'game-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el)
            el.style.display = 'none';
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const btnMap = {
        'sp-vs-pve-btn': '/game/pve',
        'one-vs-one-btn': '/game/1v1',
        'Tournament-btn': '/game/Tournament'
    };
    Object.entries(btnMap).forEach(([btnId, routePath]) => {
        var _a;
        (_a = document.getElementById(btnId)) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => navigate(routePath));
    });
    window.addEventListener('popstate', route);
    route();
});
