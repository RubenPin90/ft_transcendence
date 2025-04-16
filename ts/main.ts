import { router } from "./router.js";

function redirect( new_path : string ){
  window.location.pathname = new_path;
}

window.addEventListener('DOMContentLoaded', () =>{
  router();

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