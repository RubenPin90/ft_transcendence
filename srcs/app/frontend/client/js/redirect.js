"use strict";
const available_divs = ['change_avatar_div', 'user_settings_div', 'settings_div', 'register_div', 'profile_div', 'menu_div', 'login_div', 'home_div', 'game_div', 'friends_div', 'change_user_div', 'change_login_div'];
function toggle_divs(render) {
    available_divs.forEach(divs => {
        const element = document.getElementById(divs);
        if (element) {
            if (!element.classList.contains('hidden'))
                element.classList.add('hidden');
        }
    });
    const show = document.getElementById(render);
    if (show) {
        show.classList.remove('hidden');
    }
}
function where_am_i(path) {
    console.log("PATH: ", path);
    switch (path) {
        case '/home': return 'home_div';
        case '/profile': return 'profile_div';
        case '/login': return 'login_div';
        case '/settings': return 'settings_div';
        case '/friends': return 'friends_div';
        default: return 'home_div';
    }
}
function handleRouteChange() {
    const path = window.location.pathname;
    const divId = where_am_i(path);
    toggle_divs(divId);
}
document.querySelectorAll('[data-link]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const href = link.getAttribute('href');
        console.log("Link clicked:", href);
        if (href !== window.location.pathname) {
            history.pushState({ route: href }, '', href);
            handleRouteChange();
        }
    });
});
window.addEventListener('popstate', handleRouteChange);
handleRouteChange();
