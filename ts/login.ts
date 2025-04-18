function getInputElement(id: string): HTMLInputElement {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLInputElement)) {
        throw new Error(`Element with ID "${id}" is not an input element.`);
    }
    return element;
}

function getHTMLElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element with ID "${id}" not found.`);
    }
    return element;
}

// async function toggle_login(): Promise<void> {

//     const email = getInputElement("email-input");
//     const password = getInputElement("password-input");

//     email.classList.replace('error_input', 'form');
//     password.classList.replace('error_input', 'form');

//     const blur = getHTMLElement('toggle_login');
//     blur.classList.toggle('hidden');

//     const big_button = getHTMLElement('main_button');
//     if (blur.classList.contains('hidden')) {
//         big_button.classList.remove('hidden');
//     } else {
//         big_button.classList.add('hidden');
//     }
// }

async function let_it_shake(): Promise<void> {
    const email = getInputElement("email-input");
    const password = getInputElement("password-input");

    email.classList.replace('error_input', 'form');
    password.classList.replace('error_input', 'form');

    if (!email.value) {
        email.classList.replace('form', 'error_input');
        email.classList.remove('animate-wrong_input');
        void email.offsetWidth;
        email.classList.add('animate-wrong_input');
    }

    if (!password.value) {
        password.classList.replace('form', 'error_input');
        password.classList.remove('animate-wrong_input');
        void password.offsetWidth;
        password.classList.add('animate-wrong_input');
    }
}

async function login(): Promise<void> {
    const email = getInputElement("email-input").value;
    const password = getInputElement("password-input").value;

    if (!email || !password) {
        await let_it_shake();
        return;
    }

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    try {
        const data = await response.json();
        if (data.Response === "reload") {
            window.location.reload();
        }
    } catch (jsonError) {
        throw new Error('Error parsing the JSON response');
    }
}

document.getElementById("login-button")?.addEventListener("click", async () => {
    await login();
});

// Attach the function to the global scope
(window as any).login = login;