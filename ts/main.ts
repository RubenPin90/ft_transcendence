// import { router } from './router';

import { router } from "./router.js";

console.log("here");

window.addEventListener('DOMContentLoaded', () =>{
  router();

  document.body.addEventListener("click", (event) =>{
    const target = event as unknown as HTMLElement;
    if (target.tagName === "A" && target.classList.contains("route-link")){
      event.preventDefault();
      const href = target.getAttribute("href");
      if (href){
        window.history.pushState({}, "", href);
        router();
      }
    }
  });
});

window.addEventListener("popstate", () => {
  router();
});

// window.addEventListener('DOMContentLoaded', () => {
//   console.log("here");
//   router();

//   // Intercept link clicks
//   document.body.addEventListener('click', (event) => {
//     const target = event.target as HTMLElement;
//     console.log(target);
//     if (target.tagName === 'A' && target.classList.contains('route-link')) {
//       event.preventDefault(); // Prevent default navigation
//       const href = target.getAttribute('href');
//       console.log(href);
//       if (href) {
//         window.history.pushState({}, '', href); // Update the URL
//         router(); // Call the router to render the new page
//       }
//     }
//   });
// });

// // Handle browser back/forward navigation
// window.addEventListener('popstate', () => {
//   router();
// });