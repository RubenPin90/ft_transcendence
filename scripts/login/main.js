
async function login() {
    const email = document.getElementById("email-input").value;
    const password = document.getElementById("password-input").value;

    if (!email && !password) {
        return;
    }



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
        if (data.Response === "reload")
            window.location.reload();
        if (data.Response === "send_2FA_verification") {
            console.log(data.Content);
            document.getElementById("login-container").innerHTML = `
                <h2>Input your 2FA code from your authenticator app</h2>
                <input type="text" id="otc-input" placeholder="Code" required><br>
                <button id="mfa-login-button" onclick="mfa_login('${data.Content}')">
                    <h3>Verify</h3>
                </button>
            `;
        }
    } catch (jsonError) {
        throw new Error('Fehler beim Parsen der JSON-Antwort');
    }
}

async function mfa_login(user_id) {
    const code = document.getElementById("otc-input").value;
    if (!code)
        return;

    console.log(user_id);
    const response = await fetch('/verify_2fa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, code }),
    });

    let data;
    try {
        data = await response.json();
        console.log(data);
        if (data.Response === "reload") {
            window.location.reload();
        } else {
            alert("2FA failed. Please try again.");
        }
    } catch (jsonError) {
        alert("Fehler beim Parsen der JSON-Antwort");
    }
}