import { check } from './play.js';
import { connect } from './socket.js';

const available_divs = ['change_avatar_div','user_prof_div', 'userpass_div', 'useravatar_div', 'username_div' ,'lang_prof_div' ,'settings_main_div', 'mfa_div','user_settings_div', 'register_div', 'lang_div', 'profile_div', 'menu_div', 'login_div', 'home_div', 'game_div', 'friends_div', 'change_user_div', 'change_login_div']

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
    else if (data.Response === 'Logged out successfully'){
        // const html_response = await fetch("/get_data", {
        //     method: 'GET',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     }, body: JSON.stringify({
        //         "get": "login_html",
        //     }),
        // });
        // const html = await html_response.text();
        // const page_replace = document.getElementById("main_body");
        // if (!page_replace) {
        //     return 'home_div';
        // }
        // const temp_div = document.createElement("div");
        // temp_div.innerHTML = html;
        // const mainBody = temp_div.querySelector('#main_body');
        // if (!mainBody) {
        //     return 'home_div';
        // }
        // const main_body = mainBody?.innerHTML;
        // page_replace.innerHTML = main_body;
        history.pushState({}, '', '/login');
        // toggle_divs('login_div');
        return 'login_div';
    }
    return 'profile_div';
}

async function check_cookies_expire() : Promise<boolean>{
    const response = await fetch('/check_expire', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
    })
    if (!response.ok){
        alert("Error in check_cookies_expire in redirect");
    }
    const data = await response.json();
    if (data.Response == 'expired'){
        alert("your cookies expired");
        return true;
    }
    return false;
}

async function show_friends_page() : Promise<string>{
    var innervalueID = document.getElementById("pending_friends")
    if (!innervalueID){
        alert ("WTF");
        return 'home_div';
    }
    var innervalue = innervalueID.innerHTML;
    alert(`innervalue:: ${innervalue}`);
    const response = await fetch ('/friends', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({innervalue}),
    });
    if (!response.ok){
        alert("error with friends response");
        return 'home_div';
    };

    const data = await response.json();
    if (data.Response === 'success'){
        var element = document.getElementById("pending_friends");
        if (element){
            element.innerHTML = data.Content;
        }
    }
    else if (data.Response === 'fail'){
        alert (`error with data of friends ${data.Content}`)
        return 'home_div';
    }
    return 'friends_div';
}

export function toggle_divs(render : string){
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

export async function check_cookie_fe(): Promise<boolean> {
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

export async function render_mfa() : Promise<string>{
    // console.log("HERE");
    var innervalue = document.getElementById("mfa_div")?.innerHTML;

    const response = await fetch ('/mfa_setup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({innervalue}),
    });
    if (!response.ok){
        alert("error with MFA response");
        return 'home_div';
    };

    const data = await response.json();
    if (data.Response === 'success'){
        var element = document.getElementById("mfa_div");
        if (element){
            element.innerHTML = data.Content;
        }
    }
    else if (data.Response === 'fail'){
        alert (`error with data of MFA ${data.Content}`)
        return 'home_div';
    }
    return 'mfa_div';
}

async function show_login(){
    const response = await fetch('/get_data', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ "get": "login_html"}),
    });
    if (!response.ok){
        alert("Response is not ok in show_login");
        return;
    }
    const data = await response.text();
    const field = document.getElementById("main_body");
    if (!field){
        return;
    }
    field.innerHTML = data;
}

//TODO change window.location.href since it force refreshes the webpage
export async function where_am_i(path : string) : Promise<string> {
    switch (path) {
        case '/play':
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            await connect();
            check();
            return 'play_div';
        case '/profile': 
            if (await check_cookies_expire() == true){
                alert("expired cookies");
                await show_login();
                history.pushState({}, '', '/');
                return 'login_div';
            }
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/');
                return 'login_div';
            }
            return await show_profile_page();
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
            // if (await check_cookies_expire() == true){
            //     alert("expired cookies");
            //     await show_login();
            //     history.pushState({}, '', '/');
            //     return 'login_div';
            // }
            return 'home_div';
        case '/settings':
            // if (await check_cookies_expire() == true){
            //     alert("expired cookies");
            //     await show_login();
            //     history.pushState({}, '', '/');
            //     return 'login_div';
            // }
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'settings_main_div';
        case '/settings/user':
            // if (await check_cookies_expire() == true){
            //     alert("expired cookies");
            //     await show_login();
            //     history.pushState({}, '', '/');
            //     return 'login_div';
            // }
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'user_prof_div';
        case '/settings/language': 
            // if (await check_cookies_expire() == true){
            //     alert("expired cookies");
            //     await show_login();
            //     history.pushState({}, '', '/');
            //     return 'login_div';
            // }
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'lang_div';
        case '/settings/mfa':
            // if (await check_cookies_expire() == true){
            //     alert("expired cookies");
            //     await show_login();
            //     history.pushState({}, '', '/');
            //     return 'login_div';
            // }
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return await render_mfa();
        case '/settings/user/change_user':
            // if (await check_cookies_expire() == true){
            //     alert("expired cookies");
            //     await show_login();
            //     history.pushState({}, '', '/');
            //     return 'login_div';
            // }
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'username_div';
        case '/settings/user/change_login':
            // if (await check_cookies_expire() == true){
            //     alert("expired cookies");
            //     await show_login();
            //     history.pushState({}, '', '/');
            //     return 'login_div';
            // }
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'userpass_div';
        case '/settings/user/change_avatar':
            // if (await check_cookies_expire() == true){
            //     alert("expired cookies");
            //     await show_login();
            //     history.pushState({}, '', '/');
            //     return 'login_div';
            // }
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return 'useravatar_div';
        case '/friends' :
            // if (await check_cookies_expire() == true){
            //     alert("expired cookies");
            //     await show_login();
            //     history.pushState({}, '', '/');
            //     return 'login_div';
            // }
            if (!await check_cookie_fe()) {
                history.pushState({}, '', '/login');
                return 'login_div';
            }
            return await show_friends_page();
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
    }
    handleRouteChange();
});

window.addEventListener('popstate', handleRouteChange)


setInterval(async () => {
    // handleRouteChange();
    const path = window.location.pathname;
    // if (path === '/' || path === '/login' || path === '/register'){
    //     return;
    // }
    if (path === '/profile'){
        toggle_divs(await show_profile_page());
    }
    if (path === '/friends'){
        toggle_divs(await show_friends_page());
    }
}, 5000);

handleRouteChange();
