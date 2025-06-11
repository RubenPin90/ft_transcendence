import { render_mfa } from "./redirect.js";

export async function create_otc() {
    try {
        const response = await fetch('/settings/mfa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({"Function": "create_otc"}),
        });

        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            throw new Error('Fehler beim Parsen der JSON-Antwort');
        }

        const qrcodeDiv = document.getElementById('mfa');
        const qrcodeButtonDiv = document.getElementById('mfa-button');
        if (qrcodeDiv && qrcodeButtonDiv) {
            qrcodeDiv.innerHTML = `<img class="mx-auto mb-4" src=${data.qrCodeUrl}></p>`;
            qrcodeButtonDiv.innerHTML = `
            <input id="Code" class="input_field2" name="Code" placeholder="Code">
            <div class="flex mt-2 gap-4 w-full">
                <a class="flex-1">
                    <button onclick="verify_otc()" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                        <span class="font-bold text-lg">Submit</span>
                    </button>
                </a>
                <a class="flex-1">
                    <button onclick="render_mfa()" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                        <span class="font-bold text-lg">Back</span>
                    </button>
                </a>
            </div>
            `;
        }
        const input_field = document.getElementById('Code') as HTMLInputElement;
        if (!input_field){
            alert("WTF");
            return;
        }
        input_field.focus();
        input_field.select();
    } catch (error) {
        throw error;
    }
}

async function verify_otc() {
    const code = document.getElementById('Code') as HTMLInputElement;
    if (!code){
        return;
    }
    code.focus();
    code.select();
    if (!code.value) {
        alert("Error. Input cant be empty");
        return;
    }
    const response = await fetch('/settings/mfa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"Function": "verify_otc", "Code": code.value}),
    });
    if (!response.ok) {
        throw new Error(`HTTP Fehler! Status: ${response.status}`);
    }

    let data;
    try {
        data = await response.json();
        if (data.Response !== "success")
            alert("Error: 2FA code invalid");
        else
            render_mfa();
    } catch (jsonError) {
        throw new Error('Fehler beim Parsen der JSON-Antwort');
    }
}


async function verify_custom_code() {
    const qrcodeDiv = document.getElementById('mfa');
    const inputField = document.getElementById('Code') as HTMLInputElement;
    if (!inputField || !qrcodeDiv)
        return;

    const codeValue = inputField.value;

    try {
        const response = await fetch('/settings/mfa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "Function": "verify_function",
                "Code": codeValue
            })
        });

        const data = await response.json();
        
        if (data.Response === "success") {
            render_mfa();
            return;
        } else {
            alert("Incorrect code. Please retry!");
            inputField.value = "";
            return;
        }
    } catch (error) {
        console.error("Fehler bei der Verifizierung:", error);
        alert("Fehler beim Senden des Codes.");
    }
}



async function create_custom_code() {
    
    const qrcodeDiv = document.getElementById('mfa');
    const qrcodeButtonDiv = document.getElementById('mfa-button') as HTMLDivElement;

    if (!qrcodeDiv)
    {
        alert("NO DIV ELEMENT");
        return;
    }

    qrcodeDiv.innerHTML = '<h1 class="text-4xl font-bold text-center bg mb-4 text-white">Create your 2FA custom<br>6 diggit code</h1>';
    if (!document.getElementById('Code')) {
        qrcodeButtonDiv.innerHTML = `
            <input id="Code" class="input_field2" name="Code" placeholder="Code"><br>
            <div class="flex mt-2 gap-4 w-full">
                <a class="flex-1">
                    <button id="nextButton" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                        <span class="font-bold text-lg">Next</span>
                    </button>
                </a>
                <a class="flex-1">
                    <button onclick="render_mfa()" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                        <span class="font-bold text-lg">Back</span>
                    </button>
                </a>
            </div>
        `;
        const inputField = document.getElementById('Code') as HTMLInputElement;
            if (!inputField)
                return;
        inputField.focus();
        inputField.select();
        const nextButton = document.getElementById('nextButton') as HTMLButtonElement;

        nextButton.addEventListener('click', async function firstClick() {
            const inputField = document.getElementById('Code') as HTMLInputElement;
            if (!inputField)
                return;

            const codeValue = inputField.value;
            inputField.focus();
            inputField.select();

            try {
                const response = await fetch('/settings/mfa', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        "Function": "create_custom",
                        "Code": codeValue
                    })
                });

                const data = await response.json();
                if (data.Response === "success") {
                    qrcodeDiv.innerHTML = '<h1 class="text-4xl font-bold text-center bg mb-4 text-white">Verify your 2FA custom 6 diggit code</h1>';
                    inputField.value = "";
                    nextButton.removeEventListener('click', firstClick);
                    nextButton.addEventListener('click', verify_custom_code);
                } else {
                    alert("Fehler beim Erstellen des Codes.");
                }
            } catch (error) {
                console.error("Fehler beim Senden:", error);
                alert("Fehler beim Senden des Codes.");
            }
        });
    }
}

export async function verifyEmail() {
    const code2 = document.getElementById('Code') as HTMLInputElement;
    if (!code2){
        return;
    }
    const code = code2.value;
    try {
        const response = await fetch("/settings/mfa", {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ "Function": "verify_email", "Code": code })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }

        const data = await response.json();
        if (data.Response === "success") {
            render_mfa();
        } else {
            alert("Verification failed. Wrong password");
        }
    } catch (error) {
        console.error("Error during verification:", error);
        alert("An error occurred during verification.");
    }
}

async function create_email() {
    const response = await fetch("/settings/mfa", {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"Function": "create_email"})
    });
    
    if (!response.ok)
        throw new Error(`HTTP Fehler! Status: ${response.status}`);

    let data;
    try {
        data = await response.json();
        if (data.Response === "NoEmail")
            alert("no email set");
        else if (data.Response === "success") {
            const emailDiv = document.getElementById('mfa');
            const emailInputDiv = document.getElementById('mfa-button');
            if (!emailDiv || !emailInputDiv){
                return;
            }
            emailDiv.innerHTML = '<h1 class="text-4xl font-bold text-center bg mb-4 text-white">Verify your email code</h1>';
            emailInputDiv.innerHTML = `
                <input id="Code" class="input_field2" name="Code" placeholder="Code">
                <div class="flex mt-2 gap-4 w-full">
                    <a class="flex-1">
                        <button onclick="verifyEmail()" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                            <span class="font-bold text-lg">Verify</span>
                        </button>
                    </a>
                    <a class="flex-1">
                        <button onclick="render_mfa()" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                            <span class="font-bold text-lg">Back</span>
                        </button>
                    </a>
                </div>
            `;
            const input_field = document.getElementById('Code') as HTMLInputElement;
            input_field?.focus()
            input_field?.select();
        }
    } catch (jsonError) {
        console.error(`Fehler beim Parsen der JSON-Antwort`);
    }
}

async function remove_custom_code() {
    const response = await fetch('/settings/mfa', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"Function": "remove_custom_code"})
    })
    if (!response.ok)
        throw new Error(`HTTP Fehler! Status: ${response.status}`);

    let data;
    try {
        data = await response.json();
        if (data.Response === 'success')
            window.location.href = 'http://localhost:8080/settings/mfa';
    } catch (err) {
        console.error(`Error in removing custom code: ${err}`)
    }
}

async function remove_otc() {
    const response = await fetch('/settings/mfa', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"Function": "remove_otc"})
    })
    
    if (!response.ok)
        throw new Error(`HTTP Fehler! Status: ${response.status}`);

    let data;
    try {
        data = await response.json();
        if (data.Response === 'success')
            window.location.href = 'http://localhost:8080/settings/mfa';
    } catch (err) {
        console.error(`Error in removing custom code: ${err}`)
    }
}

async function remove_email() {
    const response = await fetch('/settings/mfa', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"Function": "remove_email"})
    });
    
    if (!response.ok)
        throw new Error(`HTTP Fehler! Status: ${response.status}`);

    let data;
    try {
        data = await response.json();
        if (data.Response === 'success')
            window.location.href = 'http://localhost:8080/settings/mfa';
    } catch (err) {
        console.error(`Error in removing custom code: ${err}`)
    }
}

async function change_language() {
    const langField = document.getElementById('lang') as HTMLInputElement;
    try{
        const lang = langField.value;
        const full_page = document.getElementById('main_body');
        if (!full_page)
            return;
        if (!lang){
            alert("Please enter a language");
            return;
        }
        const response = await fetch('/settings/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({'Function': 'change_language', 'Lang': lang, 'Page': full_page.innerHTML}),
        });
        var lang_data = await response.json();
        if (!lang_data)
            return;
        if (lang_data.Response == 'success') {
            full_page.innerHTML = lang_data.Content;
        }
    }
    catch (err){
        console.error("error with update: " + err);
        alert("error with update");
    };
}

(window as any).create_otc = create_otc;
(window as any).verify_otc = verify_otc;
(window as any).create_custom_code = create_custom_code;
(window as any).create_email = create_email;
(window as any).verifyEmail = verifyEmail;
(window as any).change_language = change_language;