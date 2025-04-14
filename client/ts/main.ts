import { startGame } from './game';

function navigate(path: string) {
  history.pushState({}, '', path);
  route();
}

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

window.addEventListener('popstate', route);
document.addEventListener('DOMContentLoaded', route);
