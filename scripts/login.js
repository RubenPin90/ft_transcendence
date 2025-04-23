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
var _a;
function getInputElement(id) {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLInputElement)) {
        throw new Error(`Element with ID "${id}" is not an input element.`);
    }
    return element;
}
function getHTMLElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element with ID "${id}" not found.`);
    }
    return element;
}
function let_it_shake() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function login() {
    return __awaiter(this, void 0, void 0, function* () {
        const email = getInputElement("email-input").value;
        const password = getInputElement("password-input").value;
        if (!email || !password) {
            yield let_it_shake();
            return;
        }
        const response = yield fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        try {
            const data = yield response.json();
            if (data.Response === "reload") {
                window.location.reload();
            }
        }
        catch (jsonError) {
            throw new Error('Error parsing the JSON response');
        }
    });
}
(_a = document.getElementById("login-button")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    yield login();
}));
window.login = login;
