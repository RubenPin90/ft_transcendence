import { renderHome } from './pages/home.js';
import { renderAbout } from './pages/about.js';



export function router() {
  const path = window.location.pathname;
  console.log("path is: ");
  console.log(path);
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
