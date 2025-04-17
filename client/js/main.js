import { startGame, stopGame } from './game.js';
const navigate = (path) => {
    history.pushState({}, '', path);
    console.log('Navigating to:', path);
    route();
};
function route() {
    const path = window.location.pathname;
    hideAllPages();
    if (path.startsWith('/game')) {
        document.getElementById('game-container').style.display = 'block';
        document.getElementById('game-mode-title').textContent = 'Mode: ' + (path.split('/')[2] || 'pve');
        stopGame();
        const mode = path.split('/')[2] || 'pve';
        // show the container etc.
        startGame(mode); // ← already launches the socket
        return;
    }
    switch (path) {
        case '/profile':
            document.getElementById('profile-page').style.display = 'block';
            break;
        case '/settings':
            document.getElementById('settings-page').style.display = 'block';
            break;
        default:
            document.getElementById('main-menu').style.display = 'block';
    }
}
function hideAllPages() {
    const pages = ['main-menu', 'profile-page', 'settings-page', 'game-container'];
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el)
            el.style.display = 'none';
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const showPage = (pageId) => {
        const pages = ['profile-page', 'settings-page'];
        pages.forEach(id => {
            const el = document.getElementById(id);
            if (el)
                el.style.display = id === pageId ? 'block' : 'none';
        });
    };
    console.log('DOM fully loaded and parsed');
    const settingsBtn = document.getElementById('settings-btn');
    const profileBtn = document.getElementById('profile-btn');
    const aiBtn = document.getElementById('sp-vs-pve-btn');
    const oneVsOneBtn = document.getElementById('one-vs-one-btn');
    const CustomgameBtn = document.getElementById('Customgame-btn');
    settingsBtn === null || settingsBtn === void 0 ? void 0 : settingsBtn.addEventListener('click', () => showPage('settings-page'));
    profileBtn === null || profileBtn === void 0 ? void 0 : profileBtn.addEventListener('click', () => showPage('profile-page'));
    // Updated navigation for game modes
    aiBtn === null || aiBtn === void 0 ? void 0 : aiBtn.addEventListener('click', () => navigate('/game/pve'));
    oneVsOneBtn === null || oneVsOneBtn === void 0 ? void 0 : oneVsOneBtn.addEventListener('click', () => navigate('/game/1v1'));
    CustomgameBtn === null || CustomgameBtn === void 0 ? void 0 : CustomgameBtn.addEventListener('click', () => navigate('/game/Customgame'));
    console.log('Game mode buttons initialized');
});
window.addEventListener('popstate', route);
document.addEventListener('DOMContentLoaded', route);
