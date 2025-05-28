const signupButton = document.getElementById('signupBtn') as HTMLButtonElement;
const loginButton = document.getElementById('loginBtn') as HTMLButtonElement;

let activeBtn: 'login' | 'signup' = 'login';
// fieldHighlight.style.left = '0%';

let googleHref: string | null = null;
let githubHref: string | null = null;

document.addEventListener('DOMContentLoaded', async function() {
    var link = window.location.href;
    link = link.slice(link.indexOf('/') + 1);
    link = link.slice(link.indexOf('/') + 1);
    link = link.slice(link.indexOf('/') + 1);

    // check if google or github
    const response = await fetch('/home', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({link}),
    });
    console.log(response);
    var data;
    try {
        var userid;
        var lang;
        var name;
        data = await response.json();
        if (data.response == "fail") {
            console.error("error with data");
            return ;
        }
        if (data.response != "success")
            return ;
        console.log(data);
        userid = data.token;
        lang = data.lang;
        name = data.name;
        document.cookie = `token=${userid}`;
        document.cookie = `lang=${lang}`;
        const welcome_field = document.getElementById("welcome-user-field");
        if (!welcome_field)
            return;
        welcome_field.innerHTML = `Welcome home user<br>${name}`;
        history.pushState({}, '', '/');
    } catch (err) {
        console.error(`error in setting cookies: ${err}`);
    }
});

const eye_closed : string = `<svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" /><path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" /><path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" /></svg>`;
const eye_open : string = `<svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clip-rule="evenodd" /></svg>`;

//TODO duplicate in user_settings.ts but dont if i cant export these functions since for whatever reson it fucks up everything and with this methong both work so ¯\_(ツ)_/¯
function eye_One(){
    const eye = document.getElementById("password_eye");
    const passwordInput = document.getElementById("password-input") as HTMLInputElement;

    if (eye && passwordInput){
        if (passwordInput.type === "password"){
            passwordInput.type = "text";
            eye.innerHTML = eye_open;
        } else {
            passwordInput.type = "password";
            eye.innerHTML = eye_closed;
        }
    }
}

function eye_Two(){
    const eye = document.getElementById("password_eye2");
    const passwordInput = document.getElementById("password-input2") as HTMLInputElement;

    if (eye && passwordInput){
        if (passwordInput.type === "password"){
            passwordInput.type = "text";
            eye.innerHTML = eye_open;
        } else {
            passwordInput.type = "password";
            eye.innerHTML = eye_closed;
        }
    }
}

function eye_Three(){
    const eye = document.getElementById("password_eye1");
    const passwordInput = document.getElementById("password-input1") as HTMLInputElement;

    if (eye && passwordInput){
        if (passwordInput.type === "password"){
            passwordInput.type = "text";
            eye.innerHTML = eye_open;
        } else {
            passwordInput.type = "password";
            eye.innerHTML = eye_closed;
        }
    }
}


function toggle_Eye(num : number){
    switch (num){
        case 1:
        {
            eye_One();
            break;
        }
        case 2:
        {
            eye_Two();
            break;
        }
        default:
        {
            eye_Three();
            return ;
        }
    }
}

async function returnLogin(): Promise<string> {
    const response = await fetch('/field_login', {
        method: 'POST',
    });
    let data;
    try{
        data = await response.json();
    } catch (err){
        alert(`error with returnLogin: ${err}`);
    }
    return data.response;
}

async function returnSignUp() : Promise<string> {
    const response = await fetch('/field_signup', {
        method: 'POST',
    });
    let data;
    try{
        data = await response.json();
    } catch (err){
        alert(`error with returnLogin: ${err}`);
    }
    return data.response;
}

// async function set_cookies(link : string){
//     console.log("PATHNAME: ", window.location.pathname);
//     if (link === 'google'){
//         console.log("IN google");
//     }else{
//         console.log("")
//     }
//     if (window.location.pathname === googleHref){
//         const response = await fetch('/home', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({googleHref}),
//         });
//         console.log(response);
//         var data;
//         try {
//             var userid;
//             var lang;
//             data = await response.json();
//             if (data.response == "fail") {
//                 console.error("error with data");
//                 return ;
//             }
//             userid = data.userid;
//             lang = data.lang;
//             document.cookie = `token=${userid}`;
//             document.cookie = `lang=${lang}`;
//         } catch (err) {
//             console.error(`error in setting cookies: ${err}`);
//         }
//     }

// }

document.addEventListener('DOMContentLoaded', function() {
    console.log('Seite wurde initial geladen');
    
    // Hier können Sie Initialisierungscode platzieren
});

document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Handle clicks on the login button
    if (target.id === 'loginBtn') {
        console.log("TARGET IS LOGIN: ", target.id);
        activate('login');
    }

    // Handle clicks on the sign-up button
    if (target.id === 'signupBtn') {
        console.log("TARGET IS SIGNUP: ", target.id);
        activate('signup');
    }
});

async function activate(tab: 'login' | 'signup') {
    let field = document.getElementById('login-signup-field');
    const fieldHighlight = document.getElementById('highlight');
    if (!fieldHighlight){
        console.error('could not find fieldHighlight for the Login | Signup field');
        return;
    }
    activeBtn = tab;
    if (tab === 'login'){ //clicked on login
        fieldHighlight.style.left = '0%';
        if (field)
            field.innerHTML = await returnLogin();
    }else { //clicked on sign up
        fieldHighlight.style.left = '50%';
        if (field)
            field.innerHTML = await returnSignUp();
    }
}


// [loginButton, signupButton].forEach((button) => {
//     button.addEventListener('click', () =>{
//         if (button === loginButton) {activate('login');}
//         else {activate('signup');}
//     });
// });
