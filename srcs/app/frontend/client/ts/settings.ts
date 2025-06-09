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
            qrcodeDiv.innerHTML = `<img class="mx-auto mb-4" src=${data.qrCodeUrl}></p>`; ////////
            // qrcodeButtonDiv.innerHTML = '<input id="Code" name="Code" placeholder="Code"></label> <button onclick="verify_code()">Verify</button> <a><button onclick="render_mfa()">Back</button></a>';
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
        // console.error('Fehler bei create_otc:', error.message);
        throw error;
    }
}

async function verify_otc() {
    const code = document.getElementById('Code') as HTMLInputElement;
    if (!code){
        alert("code not found");
        return;
    }
    code.focus();
    code.select();
    if (!code.value) {
        alert("Error. Input cant be empty");
        return;
    }
    //console.log(code.value);
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
        //     clear window and replace with nice UI Box. Client success
    } catch (jsonError) {
        throw new Error('Fehler beim Parsen der JSON-Antwort');
    }
    //console.log(data);
}


// THIS IS COPIED FROM CHATGPT. CREATE OWN FRONTEND UI
async function verify_custom_code() {
    const qrcodeDiv = document.getElementById('mfa');
    const inputField = document.getElementById('Code') as HTMLInputElement;
    if (!inputField || !qrcodeDiv)
        return;

    const codeValue = inputField.value;
    //console.log("Sende Code zur Verifizierung:", codeValue);

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



// THIS IS COPIED FROM CHATGPT. CREATE OWN FRONTEND UI
async function create_custom_code() {
    //console.log("create_custom_code gestartet");
    
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
            // <button id="nextButton">Next</button>
            // <button onclick="render_mfa()">Back</button>
        const inputField = document.getElementById('Code') as HTMLInputElement;
            if (!inputField) return;
        inputField.focus();
        inputField.select();
        const nextButton = document.getElementById('nextButton') as HTMLButtonElement;

        // Beim ersten Klick sendet der Button den Code und wechselt zur Verifikation
        nextButton.addEventListener('click', async function firstClick() {
            const inputField = document.getElementById('Code') as HTMLInputElement;
            if (!inputField) return;

            const codeValue = inputField.value;
            inputField.focus();
            inputField.select();
            //console.log("Sende Code:", codeValue);

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
                    // qrcodeDiv.innerHTML = '<h2>Verify your 2FA custom 6 diggit code</h2>';
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

// Copied from a function that used chatgpt. Rebuild pls
export async function verifyEmail() {
    // console.log("aaaaaaaAAaaaaaAAAAAAAAaaaAAAAAAAAAAAAAAAaaaAAAAaaaAAAAaaaAAAaaAAAaaaAaaaaAAaaaaAAAAaAAAaa");
    const code2 = document.getElementById('Code') as HTMLInputElement;
    // console.log(code2);
    if (!code2){
        return;
    }
    const code = code2.value;
    //console.log("Verification code:", code);
    
    // console.log("LOL");
    try {
        const response = await fetch("/settings/mfa", {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ "Function": "verify_email", "Code": code })
        });
        
        // console.log("LOL");
        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }
        // console.log("LOL");

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
            alert("no email set"); // Here an alert that there is email set. then start a promt to let user input a mail
        else if (data.Response === "success") {
            const emailDiv = document.getElementById('mfa');
            const emailInputDiv = document.getElementById('mfa-button');
            if (!emailDiv || !emailInputDiv){
                return;
            }
            // emailDiv.innerHTML = '<h2>Verify your email code</h2>';


            // <input type="text" id="email-code" placeholder="Code"></input>
            // <button onclick="verifyEmail()">Verify</button>
            // <button onclick="render_mfa()">Back</button>
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
    // //console.log(data);
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
            alert("Please enter a language"); //TODO MAKE IT MORE APPEALING WITH CSS
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
        console.log(lang_data.Content);
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

// async function logout() {
//     delete_cookie("token");
// }

// async function delete_cookie(name : string) {
//     document.cookie = name  + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
// }

(window as any).create_otc = create_otc;
(window as any).verify_otc = verify_otc;
(window as any).create_custom_code = create_custom_code;
(window as any).create_email = create_email;
(window as any).verifyEmail = verifyEmail;
(window as any).change_language = change_language;