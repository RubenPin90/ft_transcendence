import { router } from './router';

const navigate = (url: string) => {
  history.pushState(null, '', url);
  router();
};

document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.matches('[data-link]')) {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) navigate(href);
    }
  });

  window.addEventListener('popstate', router);
  router();
});
