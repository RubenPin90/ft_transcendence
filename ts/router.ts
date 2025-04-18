import { renderHome } from './pages/home.js';
import { renderSettings } from './pages/settings.js';



export function router() {
  const path = window.location.pathname;
  const app = document.getElementById('app');
  if (!app) return;

  console.log(path);
  switch (path) {
    case '/':
      // app.innerHTML = renderHome();
        renderHome().then(html => {
        document.getElementById('app')!.innerHTML = html;
      });
      break;
    case '/settings':
      app.innerHTML = renderSettings();
      break;
    default:
      app.innerHTML = `<h2 class="text-red-500">404 - Page Not Found</h2>`;
  }
}
