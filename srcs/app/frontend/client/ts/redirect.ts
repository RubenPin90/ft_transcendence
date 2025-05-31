const available_divs = ['change_avatar_div','user_prof_div', 'userpass_div', 'useravatar_div', 'username_div' ,'lang_prof_div' ,'settings_main_div', 'mfa_div','user_settings_div', 'register_div', 'profile_div', 'menu_div', 'login_div', 'home_div', 'game_div', 'friends_div', 'change_user_div', 'change_login_div']

async function show_profile_page() : Promise<string>{
    var innervalue = document.getElementById("profile_div")?.innerHTML;


    const response = await fetch ('/profile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({innervalue}),
    });

    if (!response.ok){
        alert("error with profile response");
        return 'home_div';
    }

    const data = await response.json();
    if (data.Response === 'success'){
        var element = document.getElementById("profile_div");
        if (element){
            element.innerHTML = data.Content;
        }
    }
    else if (data.Response === 'fail'){
        alert(`error with data of profile ${data.Content}`);
        return 'home_div';
    }
    return 'profile_div';
}

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
        console.error(err);
    }
    // console.log(data.content);
    if (data.content == "full")
        return true;
    return false;
}

//TODO add more routes
//TODO change window.location.href since it force refreshes the webpage
async function where_am_i(path : string) : Promise<string> {
    switch (path) {
        case '/home': return 'home_div';
        case '/profile': 
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/');
                return 'home_div';
            }
            return await show_profile_page();
        // add more routes here
        case '/register':
            if (await check_cookie_fe()) {
                history.pushState({}, '', '/');
                return 'home_div';
            }
            return 'register_div';
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
        case '/settings': 
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'settings_main_div';
        case '/settings/user': 
        if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'user_prof_div';
        case '/settings/mfa': 
        if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'mfa_div';
        case '/settings/user/change_user': 
        if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'username_div';
        case '/settings/user/change_login': 
        if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'userpass_div';
        case '/settings/user/change_avatar': 
        if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'useravatar_div';
        case '/friends' : 
        if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'friends_div';
        default: return 'home_div';
    }
}

async function handleRouteChange() {
    const path = window.location.pathname;
    const divId = await where_am_i(path);
    toggle_divs(divId);
}


document.body.addEventListener('click', (event) => {
    const data = event.target as HTMLElement;
    if (!data)
        return;
    const button = data.closest('[data-link]');
    if (!button)
        return;
    event.preventDefault();
    const href = button.getAttribute('href');
    if (href !== window.location.pathname){
        history.pushState({route: href}, '', href);
        handleRouteChange();
    }
});


window.addEventListener('popstate', handleRouteChange)

handleRouteChange();
