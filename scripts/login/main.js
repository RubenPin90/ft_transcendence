async function toggle_login() {
    const blur = document.getElementById('toggle_login');
    blur.classList.toggle('hidden');
    const button = document.getElementById('main_button');
    button.classList.add('hidden');
}


async function login() {
    console.log("HELLO");
    const email = document.getElementById("email-input").value;
    const password = document.getElementById("password-input").value;

    if (!email || !password) {
        alert("Bitte Email und Passwort eingeben!");
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
    } catch (jsonError) {
        throw new Error('Fehler beim Parsen der JSON-Antwort');
    }
}