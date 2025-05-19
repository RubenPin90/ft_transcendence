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
function $input(id) {
    return document.getElementById(id);
}
function $(id) {
    return document.getElementById(id);
}
function triggerAnimation(field) {
    if (!field)
        return;
    field.classList.remove('animate-wrong_input');
    void field.offsetWidth;
    field.classList.add('animate-wrong_input');
}
function wrong_input() {
    const header = $('error_header');
    const button = $('login-button');
    button === null || button === void 0 ? void 0 : button.classList.replace('bg-violet-700', 'bg-red-800');
    header && (header.innerHTML = 'There was an error with your credentials');
}
function check_fields(email = '', username = '', password = '', repeat = '') {
    const userField = $('user_field');
    const userInput = $input('username');
    const emailField = $('email_field');
    const emailInput = $input('email');
    const passField = $('password_field');
    const passInput = $input('password-input');
    const repField = $('repeat_field');
    const repInput = $input('password-input2');
    wrong_input();
    if (!email) {
        triggerAnimation(emailField);
        emailInput === null || emailInput === void 0 ? void 0 : emailInput.classList.replace('input_field', 'input_field_error');
    }
    else {
        emailInput === null || emailInput === void 0 ? void 0 : emailInput.classList.replace('input_field_error', 'input_field');
    }
    if (!username) {
        triggerAnimation(userField);
        userInput === null || userInput === void 0 ? void 0 : userInput.classList.replace('input_field', 'input_field_error');
    }
    else {
        userInput === null || userInput === void 0 ? void 0 : userInput.classList.replace('input_field_error', 'input_field');
    }
    if (!password) {
        triggerAnimation(passField);
        passInput === null || passInput === void 0 ? void 0 : passInput.classList.replace('input_field', 'input_field_error');
    }
    else {
        passInput === null || passInput === void 0 ? void 0 : passInput.classList.replace('input_field_error', 'input_field');
    }
    if (!repeat) {
        triggerAnimation(repField);
        repInput === null || repInput === void 0 ? void 0 : repInput.classList.replace('input_field', 'input_field_error');
    }
    else {
        repInput === null || repInput === void 0 ? void 0 : repInput.classList.replace('input_field_error', 'input_field');
    }
}
function create_account() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const email = (_b = (_a = $input('email')) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
        const username = (_d = (_c = $input('username')) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : '';
        const password = (_f = (_e = $input('password-input')) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : '';
        const repeat = (_h = (_g = $input('password-input2')) === null || _g === void 0 ? void 0 : _g.value) !== null && _h !== void 0 ? _h : '';
        if (!email || !username || !password || !repeat) {
            check_fields(email, username, password, repeat);
            return;
        }
        if (!email.includes('@')) {
            wrong_input();
            return;
        }
        const email_at_pos = email.indexOf('@');
        const email_domain = email.slice(email_at_pos + 1);
        if (!email_domain.includes('.')) {
            wrong_input();
            return;
        }
        if (username.includes('.')) {
            wrong_input();
            return;
        }
        if (password !== repeat) {
            wrong_input();
            return;
        }
        const response = yield fetch('/register', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        if (!response.ok) {
            alert('Server error');
            return;
        }
        try {
            const data = yield response.json();
            if (data.Response === 'reload')
                window.location.reload();
            else
                alert('Unexpected response:\n' + JSON.stringify(data));
        }
        catch (_j) { }
    });
}
