import { renderHome } from './pages/home.js';
import { renderAbout } from './pages/about.js';



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
        console.log("--------------------------------------------------------------");
        console.log(html);
      });
      break;
    case '/about':
      app.innerHTML = renderAbout();
      break;
    default:
      app.innerHTML = `<h2 class="text-red-500">404 - Page Not Found</h2>`;
  }
}
