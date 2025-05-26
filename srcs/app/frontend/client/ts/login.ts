async function login() {
    const email2 = document.getElementById("email-input") as HTMLInputElement;
    const password2 = document.getElementById("password-input") as HTMLInputElement;

    if (!email2 && !password2) {
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

    let data;
    try {
        data = await response.json();
        var Div = document.getElementById("login-container") as HTMLDivElement;
        if (!Div)
            return;
        if (data.Response === "reload")
            window.location.reload();
        else if (data.Response == "send_email_verification") {
            Div.innerHTML = `
                <h2>Input your Email code</h2>
                <input type="text" id="email-input" placeholder="Code" required><br>
                <button id="email-login-button" onclick="email_login('${data.Content}')">
                    <h3>Verify</h3>
                </button>
            `;
        } else if (data.Response === "send_2FA_verification") {
            Div.innerHTML = `
                <h2>Input your OTC code from your authenticator app</h2>
                <input type="text" id="otc-input" placeholder="Code" required><br>
                <button id="mfa-login-button" onclick="mfa_login('${data.Content}')">
                    <h3>Verify</h3>
                </button>
            `;
        } else if (data.Response === 'send_custom_verification') {
            Div.innerHTML = `
                <h2>Input your Custom code</h2>
                <input type="text" id="custom-input" placeholder="Code" required><br>
                <button id="custom-login-button" onclick="custom_login('${data.Content}')">
                    <h3>Verify</h3>
                </button>
            `;
        }
    } catch (jsonError) {
        throw new Error('Fehler beim Parsen der JSON-Antwort');
    }
}

async function email_login(userid : string) {
    const code2 = document.getElementById("email-input") as HTMLInputElement;
    if (!code2)
        return;

    const code = code2.value;
    // //console.log(userid);
    const response = await fetch('/verify_email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userid, code }),
    });

    let data;
    try {
        data = await response.json();
        // //console.log(data);
        if (data.Response === "reload") {
            window.location.reload();
        } else {
            alert("2FA failed. Please try again.");
        }
    } catch (jsonError) {
        alert("Fehler beim Parsen der JSON-Antwort");
    }
}

async function mfa_login(userid : string) {
    const code2 = document.getElementById("otc-input") as HTMLInputElement;
    if (!code2)
        return;

    const code = code2.value;
    const response = await fetch('/verify_2fa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userid, code }),
    });

    let data;
    try {
        data = await response.json();
        if (data.Response === "reload") {
            window.location.reload();
        } else {
            alert("2FA failed. Please try again.");
        }
    } catch (jsonError) {
        alert("Fehler beim Parsen der JSON-Antwort");
    }
}

async function custom_login(userid : string) {
    const code2 = document.getElementById("custom-input") as HTMLInputElement;
    if (!code2)
        return;

    const code = code2.value;

    const response = await fetch('/verify_custom', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userid, code }),
    });

    let data;
    try {
        data = await response.json();
        if (data.Response === "reload") {
            window.location.reload();
        } else {
            alert("2FA failed. Please try again.");
        }
    } catch (jsonError) {
        alert("Fehler beim Parsen der JSON-Antwort");
    }
}