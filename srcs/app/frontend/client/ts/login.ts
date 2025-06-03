var funct = '';

async function submit_code(){
    const tfa_value = document.getElementById("2fa_value") as HTMLInputElement;
    if (!tfa_value)
        return;
    const innervalue = tfa_value.value;

    // what: string = '';
    // switch (what){
    //     case 'send_email_verification':
    //         funct = "verify_email";
    //         break;
    //     case 'send_2FA_verification':
    //         funct = "verify_otc";
    //         break;
    //     case 'send_custom_verification':
    //         funct = "verify_function";
    //         break;
    //     default:
    //         break;
    // }

    const response = await fetch ('/mfa', {
        method: 'POST',
        headers: {'Content-Type': 'application/json',},
        body: JSON.stringify({
            "Code": innervalue,
            "Function": funct,
        }),
    });
    if (!response.ok){
        alert("Response is not ok in get_unlocker");
        return false;
    }

    const data = await response.json();

    if (data.Response == "success"){
        login();
    }
    return false;
}


async function get_unlocker() {
    var login_field = document.getElementById("login-container");
    var tfa_field = document.getElementById("2fa_field");
    if (!login_field || !tfa_field)
        return false;
    login_field.classList.add("blur_md");
    tfa_field.classList.remove("hidden");
}

function close_unlocker() {
    var login_field = document.getElementById("login-container");
    var tfa_field = document.getElementById("2fa_field");
    if (!login_field || !tfa_field)
        return;
    login_field.classList.remove("blur_md");
    tfa_field.classList.add("hidden");
}

async function login2(){
    const email2 = document.getElementById("email-input_LogIn") as HTMLInputElement;
    const password2 = document.getElementById("password-input_LogIn") as HTMLInputElement;
    if (!email2 && !password2) {
        alert("NO THIS");
        return;
    }
    
    
    const email = email2.value;
    const password = password2.value;
    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
    });
    if (!response.ok){
        alert('Server error');
        return;
    }

    try {
        const data = await response.json();
        if (data.Response !== 'success'){
            alert("Invalid username or password");
            return;
        }
    } catch (err) {
        console.error(`error with login: ${err}`);
        alert(`error with login: ${err}`);
        return;
    }
    const response2 = await fetch("/get_data", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            'get': 'get_mfa_method',
            'email': email,
            'password': password,
        }),
    });

    const data_mfa = await response2.json();
    
    if (data_mfa.Response == "send_email_verification" || data_mfa.Response == "send_2FA_verification" || data_mfa.Response == "send_custom_verification"){
        switch (data_mfa.Response){
        case 'send_email_verification':
            funct = "verify_email";
            break;
        case 'send_2FA_verification':
            funct = "verify_otc";
            break;
        case 'send_custom_verification':
            funct = "verify_function";
            break;
        default:
            break;
    }
        get_unlocker();
    }else{
        login();
    }
}

async function login() {
    // const email2 = document.getElementById("email-input_LogIn") as HTMLInputElement;
    // const password2 = document.getElementById("password-input_LogIn") as HTMLInputElement;
    // if (!email2 && !password2) {
    //     alert("NO THIS");
    //     return;
    // }
    
    
    // const email = email2.value;
    // const password = password2.value;
    // const response = await fetch('/login', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({email, password}),
    // });


    // if (!response.ok){
    //     alert('Server error');
    //     return;
    // }

    // try {
    //     const data = await response.json();
    //     if (data.Response !== 'success'){
    //         alert("Invalid username or password");
    //         return;
    //     }
    // } catch (err) {
    //     console.error(`error with login: ${err}`);
    //     alert(`error with login: ${err}`);
    //     return;
    // }

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
        // const response = await fetch("/get_data", {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({
        //         'get': 'get_mfa_method',
        //         'email': email,
        //         'password': password,
        //     }),
        // });

        // const data_mfa = await response.json();
        // alert(data_mfa.Response);
        
        // if (data_mfa.Response == "send_email_verification" || data_mfa.Response == "send_2FA_verification" || data_mfa.Response == "send_custom_verification"){
            // get_unlocker(data_mfa.Response);
        // }
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