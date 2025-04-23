import { router } from "./router.js";
function redirect(new_path) {
    window.location.pathname = new_path;
}
window.addEventListener('DOMContentLoaded', () => {
    router();
});
window.addEventListener("popstate", () => {
    router();
});
