import { renderHome } from './pages/home';
import { renderAbout } from './pages/about';

export function router() {
  const path = window.location.pathname;
  const app = document.getElementById('app');
  if (!app) return;

  switch (path) {
    case '/':
      app.innerHTML = renderHome();
      break;
    case '/about':
      app.innerHTML = renderAbout();
      break;
    default:
      app.innerHTML = `<h2 class="text-red-500">404 - Page Not Found</h2>`;
  }
}
