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
    // if (!response.ok){
    //     alert_user(`Error: ${data.Response}`);
    //     return false;
    // }

    const data = await response.json();
    
    if (data.Response == "success"){
        login();
    }else{
        alert_user(`Error: ${data.Response}`); // either close or alert user
        return false;

    }
}


// async function get_unlocker() {
//     var login_field = document.getElementById("login-container");
//     var tfa_field = document.getElementById("2fa_field");
//     if (!login_field || !tfa_field){
//         alert("NOT FOUND 1")
//         return;
//     }
//     login_field.classList.add("blur-md");
//     tfa_field.classList.remove("hidden");
// }

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
    // <div id="2fa_field" class="h-3/5 w-11/12 max-w-lg flex flex-col items-center justify-center absolute z-10 bg-gray-800/70 rounded-3xl border-[#ff00d0] border-2 shadow-strong shadow-[#ff00d0]/80">
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
    // </div>
    var mfa_div_field = document.getElementById("{{mfa_div_check}}");
    if (!mfa_div_field)
        return;
    mfa_div_field.innerHTML = temp.innerHTML;
    login_field.classList.add("blur-md");
    mfa_div_field.className = "h-3/5 w-11/12 max-w-lg flex flex-col items-center justify-center absolute z-10 bg-gray-800/70 rounded-3xl border-[#ff00d0] border-2 shadow-strong shadow-[#ff00d0]/80";
}

async function login2(){

    const email2 = document.getElementById("email-input_LogIn") as HTMLInputElement;
    const password2 = document.getElementById("password-input_LogIn") as HTMLInputElement;
    if (!email2 && !password2) {
        alert("NO THIS");
        return;
    }
    
    
    
    // 1: email und passwort holen -> check ob user
    const email = email2.value;
    const password = password2.value;



    // 2: Wenn das passt, dann: mfa methode holen -> an frontend methode
    // 3: input code sourcen und mit der mfa methode ans backend -> success oder fail
    // 4: an login ins backend schicken

    const check_user = await fetch('/get_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"get": "check_user", email, password}),
    });
    if (!check_user.ok){
        alert(`CHECK USER NOT OK`);
        return;
    }

    try{
        const data = await check_user.json();
        if (data.Response != "success"){
            alert("NOT SUCCESS");
            return;//add message
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
        alert(`CHECK USER NOT OK`);
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
    if (!email2 && !password2) {
        alert("NO THIS");
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
        window.history.pushState({}, '', '/');
    } catch (err) {
        console.error(`Error with redirect Login: ${err}`);
        return;
    }
}



    // let data;
    // try {
    //     data = await response.json();
    //     var Div = document.getElementById("login-container") as HTMLDivElement;
    //     if (!Div)
    //         return;
    //     if (data.Response === "reload")
    //         window.location.reload();
    //     else if (data.Response == "send_email_verification") {
    //         Div.innerHTML = `
    //             <h2>Input your Email code</h2>
    //             <input type="text" id="email-input" placeholder="Code" required><br>
    //             <button id="email-login-button" onclick="email_login('${data.Content}')">
    //                 <h3>Verify</h3>
    //             </button>
    //         `;
    //     } else if (data.Response === "send_2FA_verification") {
    //         Div.innerHTML = `
    //             <h2>Input your OTC code from your authenticator app</h2>
    //             <input type="text" id="otc-input" placeholder="Code" required><br>
    //             <button id="mfa-login-button" onclick="mfa_login('${data.Content}')">
    //                 <h3>Verify</h3>
    //             </button>
    //         `;
    //     } else if (data.Response === 'send_custom_verification') {
    //         Div.innerHTML = `
    //             <h2>Input your Custom code</h2>
    //             <input type="text" id="custom-input" placeholder="Code" required><br>
    //             <button id="custom-login-button" onclick="custom_login('${data.Content}')">
    //                 <h3>Verify</h3>
    //             </button>
    //         `;
    //     }
    // } catch (jsonError) {
    //     throw new Error('Fehler beim Parsen der JSON-Antwort');
    // }
// }

// async function email_login(userid : string) {
//     const code2 = document.getElementById("email-input") as HTMLInputElement;
//     if (!code2)
//         return;

//     const code = code2.value;
//     // console.log(userid);
//     const response = await fetch('/verify_email', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ userid, code }),
//     });

//     let data;
//     try {
//         data = await response.json();
//         // console.log(data);
//         if (data.Response === "reload") {
//             window.location.reload();
//         } else {
//             alert("2FA failed. Please try again.");
//         }
//     } catch (jsonError) {
//         alert("Fehler beim Parsen der JSON-Antwort");
//     }
// }

// async function mfa_login(userid : string) {
//     const code2 = document.getElementById("otc-input") as HTMLInputElement;
//     if (!code2)
//         return;

//     const code = code2.value;
//     const response = await fetch('/verify_2fa', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ userid, code }),
//     });

//     let data;
//     try {
//         data = await response.json();
//         if (data.Response === "reload") {
//             window.location.reload();
//         } else {
//             alert("2FA failed. Please try again.");
//         }
//     } catch (jsonError) {
//         alert("Fehler beim Parsen der JSON-Antwort");
//     }
// }

// async function custom_login(userid : string) {
//     const code2 = document.getElementById("custom-input") as HTMLInputElement;
//     if (!code2)
//         return;

//     const code = code2.value;

//     const response = await fetch('/verify_custom', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ userid, code }),
//     });

//     let data;
//     try {
//         data = await response.json();
//         if (data.Response === "reload") {
//             window.location.reload();
//         } else {
//             alert("2FA failed. Please try again.");
//         }
//     } catch (jsonError) {
//         alert("Fehler beim Parsen der JSON-Antwort");
//     }
// }