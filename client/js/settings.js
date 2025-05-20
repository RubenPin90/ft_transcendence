"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function create_otc() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('/settings/mfa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ "Function": "create_otc" }),
            });
            if (!response.ok) {
                throw new Error(`HTTP Fehler! Status: ${response.status}`);
            }
            let data;
            try {
                data = yield response.json();
            }
            catch (jsonError) {
                throw new Error('Fehler beim Parsen der JSON-Antwort');
            }
            const qrcodeDiv = document.getElementById('mfa');
            const qrcodeButtonDiv = document.getElementById('mfa-button');
            if (qrcodeDiv && qrcodeButtonDiv) {
                qrcodeDiv.innerHTML = `<img src=${data.qrCodeUrl}></p>`;
                qrcodeButtonDiv.innerHTML = '<input id="Code" name="Code" placeholder="Code"></label> <button onclick="verify_code()">Verify</button> <button onclick="window.location.reload()">Back</button>';
            }
        }
        catch (error) {
            throw error;
        }
    });
}
function verify_code() {
    return __awaiter(this, void 0, void 0, function* () {
        const code = document.getElementById('Code');
        if (!code) {
            alert("code not found");
            return;
        }
        if (!code.value) {
            alert("Error. Input cant be empty");
            return;
        }
        console.log(code.value);
        const response = yield fetch('/settings/mfa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ "Function": "verify", "Code": code.value }),
        });
        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }
        let data;
        try {
            data = yield response.json();
            if (data.Response !== "Success")
                alert("Error: 2FA code invalid");
            else
                window.location.href = 'http://localhost:8080/settings/mfa';
        }
        catch (jsonError) {
            throw new Error('Fehler beim Parsen der JSON-Antwort');
        }
        console.log(data);
    });
}
function verify_custom_code() {
    return __awaiter(this, void 0, void 0, function* () {
        const qrcodeDiv = document.getElementById('mfa');
        const inputField = document.getElementById('Code');
        if (!inputField || !qrcodeDiv)
            return;
        const codeValue = inputField.value;
        console.log("Sende Code zur Verifizierung:", codeValue);
        try {
            const response = yield fetch('/settings/mfa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "Function": "verify_function",
                    "Code": codeValue
                })
            });
            const data = yield response.json();
            if (data.Response === "Success") {
                alert("Code successfully registered!");
                window.location.href = 'http://localhost:8080/settings/mfa';
                return;
            }
            else {
                alert("Incorrect code. Please retry!");
                inputField.value = "";
                return;
            }
        }
        catch (error) {
            console.error("Fehler bei der Verifizierung:", error);
            alert("Fehler beim Senden des Codes.");
        }
    });
}
function create_custom_code() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("create_custom_code gestartet");
        const qrcodeDiv = document.getElementById('mfa');
        const qrcodeButtonDiv = document.getElementById('mfa-button');
        if (!qrcodeDiv)
            return;
        qrcodeDiv.innerHTML = '<h1 class="text-4xl font-bold text-center bg mb-8">Create your 2FA custom<br>6 diggit code</h1>';
        if (!document.getElementById('Code')) {
            qrcodeButtonDiv.innerHTML = `
            <input id="Code" name="Code" placeholder="Code"><br>
            <button id="nextButton">Next</button>
            <button onclick="window.location.reload()">Back</button>
        `;
            const nextButton = document.getElementById('nextButton');
            nextButton.addEventListener('click', function firstClick() {
                return __awaiter(this, void 0, void 0, function* () {
                    const inputField = document.getElementById('Code');
                    if (!inputField)
                        return;
                    const codeValue = inputField.value;
                    console.log("Sende Code:", codeValue);
                    try {
                        const response = yield fetch('/settings/mfa', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                "Function": "create_custom",
                                "Code": codeValue
                            })
                        });
                        const data = yield response.json();
                        if (data.Response === "Success") {
                            qrcodeDiv.innerHTML = '<h2>Verify your 2FA custom 6 diggit code</h2>';
                            inputField.value = "";
                            nextButton.removeEventListener('click', firstClick);
                            nextButton.addEventListener('click', verify_custom_code);
                        }
                        else {
                            alert("Fehler beim Erstellen des Codes.");
                        }
                    }
                    catch (error) {
                        console.error("Fehler beim Senden:", error);
                        alert("Fehler beim Senden des Codes.");
                    }
                });
            });
        }
    });
}
function verifyEmail() {
    return __awaiter(this, void 0, void 0, function* () {
        const code2 = document.getElementById('email-code');
        if (!code2) {
            return;
        }
        const code = code2.value;
        console.log("Verification code:", code);
        try {
            const response = yield fetch("/settings/mfa", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "Function": "verify_email", "Code": code })
            });
            if (!response.ok) {
                throw new Error(`HTTP Fehler! Status: ${response.status}`);
            }
            const data = yield response.json();
            if (data.Response === "Success") {
                alert("Email successfully verified!");
                window.location.href = 'http://localhost:8080/settings/mfa';
            }
            else {
                alert("Verification failed. Wrong password");
            }
        }
        catch (error) {
            console.error("Error during verification:", error);
            alert("An error occurred during verification.");
        }
    });
}
function create_email() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("/settings/mfa", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "Function": "create_email" })
        });
        if (!response.ok)
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        let data;
        try {
            data = yield response.json();
            if (data.Response === "NoEmail")
                alert("no email set");
            else if (data.Response === "Success") {
                const emailDiv = document.getElementById('mfa');
                const emailInputDiv = document.getElementById('mfa-button');
                if (!emailDiv || !emailInputDiv) {
                    return;
                }
                emailDiv.innerHTML = '<h2>Verify your email code</h2>';
                emailInputDiv.innerHTML = `
                <input type="text" id="email-code" placeholder="Code"></input>
                <br>
                <button onclick="verifyEmail()">Verify</button>
            `;
            }
        }
        catch (jsonError) {
            console.error(`Fehler beim Parsen der JSON-Antwort`);
        }
    });
}
function remove_custom_code() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch('/settings/mfa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "Function": "remove_custom_code" })
        });
        if (!response.ok)
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        let data;
        try {
            data = yield response.json();
            if (data.Response === 'Success')
                window.location.href = 'http://localhost:8080/settings/mfa';
        }
        catch (err) {
            console.error(`Error in removing custom code: ${err}`);
        }
    });
}
function remove_otc() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch('/settings/mfa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "Function": "remove_otc" })
        });
        if (!response.ok)
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        let data;
        try {
            data = yield response.json();
            if (data.Response === 'Success')
                window.location.href = 'http://localhost:8080/settings/mfa';
        }
        catch (err) {
            console.error(`Error in removing custom code: ${err}`);
        }
    });
}
function remove_email() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch('/settings/mfa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "Function": "remove_email" })
        });
        if (!response.ok)
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        let data;
        try {
            data = yield response.json();
            if (data.Response === 'Success')
                window.location.href = 'http://localhost:8080/settings/mfa';
        }
        catch (err) {
            console.error(`Error in removing custom code: ${err}`);
        }
    });
}
function change_language() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("/settings/user", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 'Function': 'change_language' })
        });
        if (!response.ok)
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        let data;
        try {
        }
        catch (err) {
            console.error(`Error in change language: ${err}`);
        }
    });
}
function logout() {
    return __awaiter(this, void 0, void 0, function* () {
        delete_cookie("token");
        location.reload();
    });
}
function delete_cookie(name) {
    return __awaiter(this, void 0, void 0, function* () {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });
}
