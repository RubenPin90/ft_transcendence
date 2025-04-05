async function toggle_login() {
    const blur = document.getElementById('toggle_login');
    blur.classList.toggle('hidden');
    const big_button = document.getElementById('main_button');
    if (blur.classList.contains('hidden')){
        big_button.classList.remove('hidden');
    }else{
        big_button.classList.add('hidden');
    }
}

async function let_it_shake(){
    const email = document.getElementById("email-input");
    const password = document.getElementById("password-input");

    if (!email.value){
        email.classList.replace('form', 'error_input');
        email.classList.remove('animate-wrong_input');
        void email.offsetWidth;
        email.classList.add('animate-wrong_input');
    }
    if(!password.value){
        password.classList.replace('form', 'error_input');
        password.classList.remove('animate-wrong_input');
        void password.offsetWidth;
        password.classList.add('animate-wrong_input');
    }
}


async function login() {
    console.log("HELLO");
    const email = document.getElementById("email-input").value;
    const password = document.getElementById("password-input").value;


    if (!email || !password) {
        // alert("Bitte Email und Passwort eingeben!");
        let_it_shake();
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