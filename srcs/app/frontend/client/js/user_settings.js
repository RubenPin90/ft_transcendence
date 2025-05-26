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
function parse_email(email) {
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email_regex.test(email)) {
        return true;
    }
    alert("email is not valid");
    return false;
}
function eye_one() {
    const eye = document.getElementById("password_eye");
    const passwordInput = document.getElementById("password-input");
    if (eye && passwordInput) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            eye.innerHTML = `
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clip-rule="evenodd" />
            </svg>
            `;
        }
        else {
            passwordInput.type = "password";
            eye.innerHTML = `
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
                <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />
                <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" />
            </svg>
            `;
        }
    }
}
function eye_two() {
    const eye = document.getElementById("password_eye2");
    const passwordInput = document.getElementById("password-input2");
    if (eye && passwordInput) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            eye.innerHTML = `
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clip-rule="evenodd" />
            </svg>
            `;
        }
        else {
            passwordInput.type = "password";
            eye.innerHTML = `
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
                <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />
                <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" />
            </svg>
            `;
        }
    }
}
function toggle_eye(num) {
    switch (num) {
        case 1:
            {
                eye_one();
                break;
            }
        case 2:
            {
                eye_two();
                break;
            }
        default:
            return;
    }
}
function return_main_settings() {
    return `
    <div class="flex flex-col mt-8 gap-6">
        <a href="/settings/user/change_user" class="buttons" data-link>
            <button class="block w-full mb-4 mt-6">
                <span class="button_text">change username</span>
            </button>
        </a>
        <a href="/settings/user/change_login" class="buttons" data-link>
            <button class="block w-full mb-4 mt-6">
                <span class="button_text">change login data</span>
            </button>
        </a>
        <a href="/settings/user/change_avatar" class="buttons" data-link>
            <button class="block w-full mb-4 mt-6">
                <span class="button_text">change avatar</span>
            </button>
        </a>
    </div>
    <div class="flex mt-12 w-1/2">
        <a href="/" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Main Page</span>
            </button>
        </a>
    </div>
    `;
}
function return_change_uname() {
    return `
    <div id="user_field" class="relative input_total">
        <div class="input_svg">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" />
                </svg>
        </div>
        <input type="text" id="username" placeholder="Username" required class="input_field" />
    </div>
    <div class="flex mt-12 gap-4 w-full">
        <a class="flex-1">
            <button onclick="change_user()" class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Submit</span>
            </button>
        </a>
        <a href="/settings/user/profile_settings" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Back</span>
            </button>
        </a>
    </div>
    `;
}
function return_change_credential() {
    return `
    <label for="email" class="label_text">Email</label>
    <div id="email_field" class="relative input_total">
        <div class="input_svg">
            <svg class="w-6 h-6 text-gray-500 justify-center" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 16">
                <path d="m10.036 8.278 9.258-7.79A1.979 1.979 0 0 0 18 0H2A1.987 1.987 0 0 0 .641.541l9.395 7.737Z"/>
                <path d="M11.241 9.817c-.36.275-.801.425-1.255.427-.428 0-.845-.138-1.187-.395L0 2.6V14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2.5l-8.759 7.317Z"/>
            </svg>
        </div>
        <input type="text" id="email" placeholder="example@gmail.com" required class="input_field" />
    </div>
    <label for="password-input" class="label_text">Password</label>
    <div id="password_field" class="relative input_total">
        <div class="input_svg">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path fill-rule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clip-rule="evenodd" />
            </svg>
        </div>
        <button onclick="toggle_eye(1)" id="password_eye" class="password_eye" tabindex="-1">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
                <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />
                <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" />
                </svg>
        </button>
        <input type="password" id="password-input" placeholder="Password" required class="input_field" />
    </div>
    <label for="password-input2" class="label_text">Repeat Password</label>
    <div id="repeat_field" class="relative input_total">
        <div class="input_svg">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path fill-rule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clip-rule="evenodd" />
            </svg>
        </div>
        <button onclick="toggle_eye(2)" id="password_eye2" class="password_eye" tabindex="-1">
            <svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" />
                <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" />
                <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" />
            </svg>
        </button>
        <input type="password" id="password-input2" placeholder="Repeat password" required class="input_field" />
    </div>
    <div class="flex mt-12 gap-4 w-full">
        <a class="flex-1">
            <button onclick="change_logindata()" id="submit_button" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Submit</span>
            </button>
        </a>
        <a href="/settings/user/profile_settings" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Back</span>
            </button>
        </a>
    </div>
    `;
}
function return_change_avatar() {
    return `
    <div class="to-[#d16e1d] from-[#e0d35f] bg-gradient-to-br rounded-lg">
        <label class="pl-2 block mb-2 font-medium text-gray-900 text-2xl" for="file_input">Upload file</label>
        <input class="block w-full text-sm text-gray-900 border border-[#e0d35f] to-[#d16e1d] from-[#e0d35f] bg-gradient-to-br  rounded-lg cursor-pointer" id="file_input" type="file">
    </div>
    <div class="flex mt-12 gap-4 w-full">
        <a class="flex-1">
            <button onclick="change_avatar()" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Submit</span>
            </button>
        </a>
        <a href="/settings/user/profile_settings" class="flex-1" data-link>
            <button class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">
                <span class="font-bold text-lg">Back</span>
            </button>
        </a>
    </div>
    `;
}
function change_user() {
    return __awaiter(this, void 0, void 0, function* () {
        const usernameField = document.getElementById('username');
        try {
            const usernameValue = usernameField.value;
            if (!usernameValue) {
                alert("please enter a username");
                return;
            }
            const response = yield fetch('/update_user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ usernameValue }),
            });
            const result = yield response.json();
            if (response.ok) {
                alert("update was successfull");
            }
            else {
                alert("Error: " + result.message);
            }
        }
        catch (err) {
            alert("error with update");
        }
        ;
    });
}
;
function change_logindata() {
    return __awaiter(this, void 0, void 0, function* () {
        const emailField = document.getElementById('email');
        const passField = document.getElementById('password-input');
        const repField = document.getElementById('password-input2');
        const emailValue = emailField.value;
        const passValue = passField.value;
        const repValue = repField.value;
        const value_struct = {
            email: emailValue,
            password: passValue,
            avatar: null
        };
        if (passValue !== repValue) {
            alert("password is not equal to repeat password");
            return;
        }
        if (parse_email(emailValue) === false) {
            return;
        }
        try {
            const response = yield fetch('/update_settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(value_struct)
            });
        }
        catch (err) {
            console.error('Error updating logindata: ', err);
        }
    });
}
function change_avatar() {
    return __awaiter(this, void 0, void 0, function* () {
        const avatar_field = document.getElementById("file_input");
        if (!avatar_field || !avatar_field.files) {
            alert("No file selected");
            return;
        }
        const file = avatar_field.files[0];
        const read = new FileReader();
        read.readAsDataURL(file);
        read.onload = () => __awaiter(this, void 0, void 0, function* () {
            const base64 = read.result;
            const value_struct = {
                email: null,
                password: null,
                avatar: base64
            };
            try {
                const response = yield fetch('/update_settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(value_struct)
                });
                if (response.ok) {
                }
                else {
                    alert("error updating avatar");
                }
            }
            catch (err) {
                console.error('Error updating logindata: ', err);
            }
        });
        read.onerror = () => {
            console.error("Read file failed");
        };
    });
}
document.addEventListener('DOMContentLoaded', () => {
    let field = document.getElementById("user_field");
    if (!field)
        return;
    const update = (pathname) => {
        switch (pathname) {
            case "/settings/user/profile_settings":
                field.innerHTML = return_main_settings();
                break;
            case "/settings/user/change_avatar":
                field.innerHTML = return_change_avatar();
                break;
            case "/settings/user/change_login":
                field.innerHTML = return_change_credential();
                break;
            case "/settings/user/change_user":
                field.innerHTML = return_change_uname();
            default:
                break;
        }
        attachButtonListeners();
    };
    const attachButtonListeners = () => {
        document.querySelectorAll('.buttons').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const target = event.currentTarget;
                const path = target.getAttribute('href');
                if (path) {
                    window.history.pushState({}, '', path);
                    update(path);
                }
            });
        });
    };
    update(window.location.pathname);
    window.addEventListener('popstate', () => {
        update(window.location.pathname);
    });
});
