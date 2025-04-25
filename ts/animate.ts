const signupButton = document.getElementById('signupBtn') as HTMLButtonElement;
const loginButton = document.getElementById('loginBtn') as HTMLButtonElement;
const fieldHighlight = document.getElementById('highlight') as HTMLDivElement;
let field = document.getElementById('login-signup-field');

let activeBtn: 'login' | 'signup' = 'login';
fieldHighlight.style.left = '0%';

let googleHref: string | null = null;
let githubHref: string | null = null;

// Retrieve the initial href values when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const googleLinkElement = document.getElementById('google') as HTMLAnchorElement;
    const githubLinkElement = document.getElementById('github') as HTMLAnchorElement;

    if (googleLinkElement) {
        googleHref = googleLinkElement.href;
    }
    if (githubLinkElement) {
        githubHref = githubLinkElement.href;
    }
});

function returnLogin(): string {
    return `
    <input type="text" id="email-input" placeholder="Email" required class="input_field" />
    <input type="password" id="password-input" placeholder="Password" required class="input_field" />
    <button id="login-button" onclick="login()" class="bg-violet-700 hover:bg-violet-800 text-white font-bold py-2 text-lg rounded-xl w-full mb-4 transition-all">
        Login
    </button>

    <div class="w-full mt-4 space-y-4">
        <a id="google" href="${googleHref}">
            <button type="button" class="text-white bg-[#1973e7] font-medium rounded-xl text-lg px-5 py-2.5 w-full flex items-center justify-center gap-4 border">
                <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
                    <path fill="#fbc02d" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#e53935" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4caf50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1565c0" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
                <span>Sign in with Google</span>
            </button>
        </a>

        <a id="github" href="${githubHref}">
            <button type="button" class="text-white bg-[#221f1f] font-medium rounded-xl text-lg px-5 py-2.5 w-full flex items-center justify-center gap-4 border mt-2">
                <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
                    <g fill="#ffffff" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(8.53333,8.53333)"><path d="M15,3c-6.627,0 -12,5.373 -12,12c0,5.623 3.872,10.328 9.092,11.63c-0.056,-0.162 -0.092,-0.35 -0.092,-0.583v-2.051c-0.487,0 -1.303,0 -1.508,0c-0.821,0 -1.551,-0.353 -1.905,-1.009c-0.393,-0.729 -0.461,-1.844 -1.435,-2.526c-0.289,-0.227 -0.069,-0.486 0.264,-0.451c0.615,0.174 1.125,0.596 1.605,1.222c0.478,0.627 0.703,0.769 1.596,0.769c0.433,0 1.081,-0.025 1.691,-0.121c0.328,-0.833 0.895,-1.6 1.588,-1.962c-3.996,-0.411 -5.903,-2.399 -5.903,-5.098c0,-1.162 0.495,-2.286 1.336,-3.233c-0.276,-0.94 -0.623,-2.857 0.106,-3.587c1.798,0 2.885,1.166 3.146,1.481c0.896,-0.307 1.88,-0.481 2.914,-0.481c1.036,0 2.024,0.174 2.922,0.483c0.258,-0.313 1.346,-1.483 3.148,-1.483c0.732,0.731 0.381,2.656 0.102,3.594c0.836,0.945 1.328,2.066 1.328,3.226c0,2.697 -1.904,4.684 -5.894,5.097c1.098,0.573 1.899,2.183 1.899,3.396v2.734c0,0.104 -0.023,0.179 -0.035,0.268c4.676,-1.639 8.035,-6.079 8.035,-11.315c0,-6.627 -5.373,-12 -12,-12z"></path></g></g>
                </svg>
                <span>Sign in with GitHub</span>
            </button>
        </a>
    </div>`;
}

function returnSignUp() : string {
    return `

    <input type="text" id="username" placeholder="Username" required class="input_field" />
    <input type="text" id="email" placeholder="Email" required class="input_field" />
    <input type="text" id="password" placeholder="Password" required class="input_field" />
    <input type="text" id="repeat" placeholder="Repeat password" required class="input_field" />
    <span id="error_header" class="text-bold text-xl text-red-400"></span><br>
    <span id="input_error" class="field_error"></span>

    <button id="login-button" onclick="create_account()" class="bg-violet-700 hover:bg-violet-800 text-white font-bold py-2 text-lg rounded-xl w-full mb-4">
        Sign Up
    </button>

    <div class="w-full mt-4 space-y-4">
        <a id="google" href="${googleHref}">
            <button type="button" class="text-white bg-[#1973e7] font-medium rounded-xl text-lg px-5 py-2.5 w-full flex items-center justify-center gap-4 border">
                <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
                    <path fill="#fbc02d" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#e53935" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4caf50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1565c0" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
                <span>Sign Up with Google</span>
            </button>
        </a>

        <a id="github" href="${githubHref}">
            <button type="button" class="text-white bg-[#221f1f] font-medium rounded-xl text-lg px-5 py-2.5 w-full flex items-center justify-center gap-4 border mt-2">
                <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
                    <g fill="#ffffff" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(8.53333,8.53333)"><path d="M15,3c-6.627,0 -12,5.373 -12,12c0,5.623 3.872,10.328 9.092,11.63c-0.056,-0.162 -0.092,-0.35 -0.092,-0.583v-2.051c-0.487,0 -1.303,0 -1.508,0c-0.821,0 -1.551,-0.353 -1.905,-1.009c-0.393,-0.729 -0.461,-1.844 -1.435,-2.526c-0.289,-0.227 -0.069,-0.486 0.264,-0.451c0.615,0.174 1.125,0.596 1.605,1.222c0.478,0.627 0.703,0.769 1.596,0.769c0.433,0 1.081,-0.025 1.691,-0.121c0.328,-0.833 0.895,-1.6 1.588,-1.962c-3.996,-0.411 -5.903,-2.399 -5.903,-5.098c0,-1.162 0.495,-2.286 1.336,-3.233c-0.276,-0.94 -0.623,-2.857 0.106,-3.587c1.798,0 2.885,1.166 3.146,1.481c0.896,-0.307 1.88,-0.481 2.914,-0.481c1.036,0 2.024,0.174 2.922,0.483c0.258,-0.313 1.346,-1.483 3.148,-1.483c0.732,0.731 0.381,2.656 0.102,3.594c0.836,0.945 1.328,2.066 1.328,3.226c0,2.697 -1.904,4.684 -5.894,5.097c1.098,0.573 1.899,2.183 1.899,3.396v2.734c0,0.104 -0.023,0.179 -0.035,0.268c4.676,-1.639 8.035,-6.079 8.035,-11.315c0,-6.627 -5.373,-12 -12,-12z"></path></g></g>
                </svg>
                <span>Sign Up with GitHub</span>
            </button>
        </a>
    </div>
    `
}

document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Handle clicks on the login button
    if (target.id === 'loginBtn') {
        activate('login');
    }

    // Handle clicks on the sign-up button
    if (target.id === 'signupBtn') {
        activate('signup');
    }
});

async function activate(tab: 'login' | 'signup') {
    activeBtn = tab;
    if (tab === 'login'){ //clicked on login
        fieldHighlight.style.left = '0%';
        if (field)
            field.innerHTML = returnLogin();
    }else { //clicked on sign up
        fieldHighlight.style.left = '50%';
        if (field)
            field.innerHTML = returnSignUp();
    }
}


// [loginButton, signupButton].forEach((button) => {
//     button.addEventListener('click', () =>{
//         if (button === loginButton) {activate('login');}
//         else {activate('signup');}
//     });
// });
