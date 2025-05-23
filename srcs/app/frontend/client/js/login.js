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
function login() {
    return __awaiter(this, void 0, void 0, function* () {
        const email2 = document.getElementById("email-input");
        const password2 = document.getElementById("password-input");
        if (!email2 && !password2) {
            return;
        }
        const email = email2.value;
        const password = password2.value;
        const response = yield fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        let data;
        try {
            data = yield response.json();
            var Div = document.getElementById("login-container");
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
            }
            else if (data.Response === "send_2FA_verification") {
                Div.innerHTML = `
                <h2>Input your OTC code from your authenticator app</h2>
                <input type="text" id="otc-input" placeholder="Code" required><br>
                <button id="mfa-login-button" onclick="mfa_login('${data.Content}')">
                    <h3>Verify</h3>
                </button>
            `;
            }
            else if (data.Response === 'send_custom_verification') {
                Div.innerHTML = `
                <h2>Input your Custom code</h2>
                <input type="text" id="custom-input" placeholder="Code" required><br>
                <button id="custom-login-button" onclick="custom_login('${data.Content}')">
                    <h3>Verify</h3>
                </button>
            `;
            }
        }
        catch (jsonError) {
            throw new Error('Fehler beim Parsen der JSON-Antwort');
        }
    });
}
function email_login(userid) {
    return __awaiter(this, void 0, void 0, function* () {
        const code2 = document.getElementById("email-input");
        if (!code2)
            return;
        const code = code2.value;
        const response = yield fetch('/verify_email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userid, code }),
        });
        let data;
        try {
            data = yield response.json();
            if (data.Response === "reload") {
                window.location.reload();
            }
            else {
                alert("2FA failed. Please try again.");
            }
        }
        catch (jsonError) {
            alert("Fehler beim Parsen der JSON-Antwort");
        }
    });
}
function mfa_login(userid) {
    return __awaiter(this, void 0, void 0, function* () {
        const code2 = document.getElementById("otc-input");
        if (!code2)
            return;
        const code = code2.value;
        const response = yield fetch('/verify_2fa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userid, code }),
        });
        let data;
        try {
            data = yield response.json();
            if (data.Response === "reload") {
                window.location.reload();
            }
            else {
                alert("2FA failed. Please try again.");
            }
        }
        catch (jsonError) {
            alert("Fehler beim Parsen der JSON-Antwort");
        }
    });
}
function custom_login(userid) {
    return __awaiter(this, void 0, void 0, function* () {
        const code2 = document.getElementById("custom-input");
        if (!code2)
            return;
        const code = code2.value;
        const response = yield fetch('/verify_custom', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userid, code }),
        });
        let data;
        try {
            data = yield response.json();
            if (data.Response === "reload") {
                window.location.reload();
            }
            else {
                alert("2FA failed. Please try again.");
            }
        }
        catch (jsonError) {
            alert("Fehler beim Parsen der JSON-Antwort");
        }
    });
}
