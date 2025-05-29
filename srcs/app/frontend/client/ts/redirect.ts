const available_divs = ['change_avatar_div', 'user_settings_div', 'settings_div', 'register_div', 'profile_div', 'menu_div', 'login_div', 'home_div', 'game_div', 'friends_div', 'change_user_div', 'change_login_div']

function toggle_divs(render : string){
    available_divs.forEach(divs => {
        const element = document.getElementById(divs);
        if (element){
            if (!element.classList.contains('hidden'))
                element.classList.add('hidden');
        }
    });

    const show = document.getElementById(render);
    if (show){
        show.classList.remove('hidden');
    }
}

async function check_cookie_fe(): Promise<boolean> {
    const cookie_response = await fetch("/get_data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        }, body: JSON.stringify({
            "get": "cookies",
        }),
    })

    var data;
    try {
        data = await cookie_response.json();
    } catch (err) {
        console.log(err);
    }
    console.log(data.content);
    if (data.content == "full")
        return true;
    return false;
}

//TODO add more routes
//TODO change window.location.href since it force refreshes the webpage
async function where_am_i(path : string) : Promise<string> {
    console.log("PATH: ", path);
    switch (path) {
        case '/home': return 'home_div';
        case '/profile': return 'profile_div';
        // add more routes here
        case '/login':
            if (await check_cookie_fe()) {
                history.pushState({}, '', '/');
                return 'home_div';
            }
            return 'login_div';
        case '/':
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'home_div';
        case '/settings': return 'settings_div';
        case '/friends' : return 'friends_div';
        default: return 'home_div';
    }
}

async function handleRouteChange() {
    const path = window.location.pathname;
    const divId = await where_am_i(path);
    toggle_divs(divId);
}


document.querySelectorAll('[data-link]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const href = (link as HTMLAnchorElement).getAttribute('href');
        console.log("Link clicked:", href);
        if (href !== window.location.pathname) {
            history.pushState({route: href}, '', href);
            handleRouteChange();
        }
    })
});


window.addEventListener('popstate', handleRouteChange)

handleRouteChange();
