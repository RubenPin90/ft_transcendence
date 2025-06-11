import { connect as openSocket } from './socket.js';

function alert_user(message: string){
    var error_message = document.getElementById("error_message") as HTMLSpanElement;
    if (!error_message)
        return;
    error_message.innerHTML = message;
}

async function submit_code(userid: string, method: string, email: string){
    const tfa_value = document.getElementById("2fa_value") as HTMLInputElement;
    if (!tfa_value)
        return;

    const innervalue = tfa_value.value;
    var funct = '';
    switch(method){
        case 'send_2FA_verification':
            funct = 'verify_otc';
            break;
        case 'send_custom_verification':
            funct = 'verify_function';
            break;
        case 'send_email_verification':
            funct = 'verify_email';
            break;
        default:
            break;
    }

    const response = await fetch ('/check_preferred_mfa', {
        method: 'POST',
        headers: {'Content-Type': 'application/json',},
        body: JSON.stringify({
            "Code": innervalue,
            "Function": funct,
            "Userid": userid,
        }),
    });

    const data = await response.json();
    
    if (data.Response == "success"){
        login();
    }else{
        alert_user(`Error: ${data.Response}`);
        return false;

    }
}

function close_unlocker() {
    var mfa_div_field = document.getElementById("{{mfa_div_check}}");
    var login_field = document.getElementById("login-container");
    if (!login_field || !mfa_div_field){
        alert("NOT FOUND 2")
        return;
    }
    login_field.classList.remove("blur-md");
    mfa_div_field.className = "";
    mfa_div_field.innerHTML = "";
}

async function get_mfa_login(userid: string, method: string, email: string){
    const login_field = document.getElementById("login-container");
    if (!login_field)
        return; 
    var temp = document.createElement("div");
    temp.innerHTML = `
        <span id="error_message" class="text-xl text-red-900 font-bold"></span>
        <span class="text-3xl mb-6 font-bold text-gray-300">Enter your choosen 2FA</span>
            <input type="text" id="2fa_value" placeholder="enter your 2FA code" class="p-4 rounded-xl text-center w-3/4">
            <button id="login-button" onclick="submit_code('${userid}', '${method}', '${email}')" class="mt-4 bg-violet-700 hover:bg-violet-800 w-24 text-white font-bold py-2 text-lg rounded-xl mb-4">
                Submit
            </button>
            <button onclick="close_unlocker()" class="absolute top-10 right-10 border-black bg-yellow-600 p-1 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
        </button>
    `;
    var mfa_div_field = document.getElementById("{{mfa_div_check}}");
    if (!mfa_div_field)
        return;
    mfa_div_field.innerHTML = temp.innerHTML;
    login_field.classList.add("blur-md");
    mfa_div_field.className = "h-3/5 w-11/12 max-w-lg flex flex-col items-center justify-center absolute z-10 bg-gray-800/70 rounded-3xl border-[#ff00d0] border-2 shadow-[#ff00d0]/80";
}

document.getElementById('login-button')?.addEventListener('click', login2);

export async function login2(){
    const email2 = document.getElementById("email-input_LogIn") as HTMLInputElement;
    const password2 = document.getElementById("password-input_LogIn") as HTMLInputElement;
    if (!email2 && !password2) {
        return;
    }
    const email = email2.value;
    const password = password2.value;

    const check_user = await fetch('/get_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"get": "check_user", email, password}),
    });

    try{
        const data = await check_user.json();
        if (data.Response != "success"){
            alert(`Error with login: ${data.Response}`);
            return;
        }
    } catch(err) {
        alert(`error with data check_user: ${err}`);
        return;
    }
    const get_mfa_method = await fetch('/get_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"get": "get_mfa_method", email, password}),
    });
    if (!get_mfa_method.ok){
        alert(`CHECK USER NOT OK MFA`);
        return;
    }

    try{
        const data = await get_mfa_method.json();
        if (data.Response == "send_email_verification" || data.Response == "send_2FA_verification" || data.Response == "send_custom_verification"){
            return get_mfa_login(data.Content, data.Response, email);//add message
        }
    } catch(err) {
        alert(`error with data get_mfa_method: ${err}`);
        return;
    }
    login();
}

async function login() {
    const email2 = document.getElementById("email-input_LogIn") as HTMLInputElement;
    const password2 = document.getElementById("password-input_LogIn") as HTMLInputElement;
    if (!email2 || !password2) {
        return;
    }
    
    
    const email = email2.value;
    const password = password2.value;
    const token = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
    });


    if (!token.ok){
        alert('Server error');
        return;
    }

    try {
        const data = await token.json();
        if (data.Response !== 'success'){
            alert("Invalid username or password");
            return;
        }
    } catch (err) {
        console.error(`error with login: ${err}`);
        alert(`error with login: ${err}`);
        return;
    }

    const response = await fetch('/get_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "get" : "site_content"
        }),
    });

    try {
        const data2 = await response.json();
        const content = data2.Content;

        const content2 = content.match(/<body class="background" id="main_body">([\s\S]*?)<\/body>/);
        const content2value = content2[1].trim();
        var current_file = document.getElementById("main_body");
        if (!current_file)
            return;
        current_file.innerHTML = content2value;
        history.replaceState({}, '', '/');
        try {
            await openSocket();
          } catch (err) {
            console.error('WS failed to connect', err);
          }
    } catch (err) {
        console.error(`Error with redirect Login: ${err}`);
        return;
    }
}

(window as any).login = login;
(window as any).submit_code = submit_code;