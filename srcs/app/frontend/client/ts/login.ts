async function login() {
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

    const response2 = await fetch('/get_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "get" : "site_content"
        }),
    });

    try {
        const data2 = await response2.json();
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