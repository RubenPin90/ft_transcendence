import { startGame } from './game.js';

const navigate = (path: string) => {
  history.pushState({}, '', path);
  console.log('Navigating to:', path);
  route();
};

function route() {
  const path = window.location.pathname;
  hideAllPages();

  if (path.startsWith('/game')) {
    const mode = path.split('/')[2] || 'default';
    hideAllPages();
    document.getElementById('game-container')!.style.display = 'block';
    document.getElementById('game-mode-title')!.textContent = `Starting ${mode.toUpperCase()} Game...`;
  
    startGame(mode);
    return;
  }

  switch (path) {
    case '/profile':
      document.getElementById('profile-page')!.style.display = 'block';
      break;
    case '/settings':
      document.getElementById('settings-page')!.style.display = 'block';
      break;
    default:
      document.getElementById('main-menu')!.style.display = 'block';
  }
}

function hideAllPages() {
  const pages = ['main-menu', 'profile-page', 'settings-page', 'game-container'];
  pages.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}


document.addEventListener('DOMContentLoaded', () => {
  const showPage = (pageId: string) => {
      const pages = ['profile-page', 'settings-page'];
      pages.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = id === pageId ? 'block' : 'none';
      });
  };
  console.log('DOM fully loaded and parsed');

  const settingsBtn = document.getElementById('settings-btn');
  const profileBtn = document.getElementById('profile-btn');
  const aiBtn = document.getElementById('sp-vs-ai-btn');
  const oneVsOneBtn = document.getElementById('one-vs-one-btn');
  const deathmatchBtn = document.getElementById('deathmatch-btn');

  settingsBtn?.addEventListener('click', () => showPage('settings-page'));
  profileBtn?.addEventListener('click', () => showPage('profile-page'));

  // Updated navigation for game modes
  aiBtn?.addEventListener('click', () => navigate('/game/ai'));
  oneVsOneBtn?.addEventListener('click', () => navigate('/game/1v1'));
  deathmatchBtn?.addEventListener('click', () => navigate('/game/deathmatch'));
  console.log('Game mode buttons initialized');
});


window.addEventListener('popstate', route);
document.addEventListener('DOMContentLoaded', route);
