import { login } from "../../views";

async function wrong_input(error_message){
    let span = document.getElementById("input_error");
    let header = document.getElementById("error_header");
    let button = document.getElementById("login-button");
    
    button.classList.replace("bg-violet-700", "bg-red-800")
    // button.classList.replace("hover:bg-violet-800", "cursor-not-allowed")
    header.innerHTML = "There was an errors with your input:"
    span.innerHTML = error_message;
}

async function check_fields(email, username, password, repeat){
    let email_field = document.getElementById("email");
    let user_field = document.getElementById("username");
    let pass_field = document.getElementById("password");
    let rep_field = document.getElementById("repeat");

    wrong_input("one or more inputs are empty");
    if (!email){
        email_field.classList.replace("input_field", "input_field_error");
    } else if(email){
        email_field.classList.replace("input_field_error", "input_field");
    }
    if (!username){
        user_field.classList.replace("input_field", "input_field_error");
    } else if (username){
        user_field.classList.replace("input_field_error", "input_field");
    }
    if (!password){
        pass_field.classList.replace("input_field", "input_field_error");
    } else if (password){
        pass_field.classList.replace("input_field_error", "input_field");
    }
    if (!repeat){
        rep_field.classList.replace("input_field", "input_field_error");
    } else if (repeat){
        rep_field.classList.replace("input_field_error", "input_field");
    }
    return;
}

async function everything_correct(){
    let button = document.getElementById("login-button");
    button.classList.replace("bg-red-600", "bg-violet-700")
    
}

async function create_account() {
    const email = String(document.getElementById('email').value);
    const username = String(document.getElementById('username').value);
    const password = String(document.getElementById('password').value);
    const repeat = String(document.getElementById('repeat').value);
    
    if (!email || !username || !password || !repeat)
    {
        check_fields(email, username, password, repeat);
        return;
    }
    if (!email.includes('@')) {
        wrong_input("email doesn't have @ sign");
        return; // show error on screen
    }
    const email_at_pos = email.indexOf('@');
    var email_name = email.slice(0, email_at_pos);
    const email_domain = email.slice(email_at_pos + 1);
    email_name = email_name.replace(/\./g, '-');
    if (!email_domain.includes('.')){
        alert("email is wrong");
        return; // show error on screen
    }
    if (username.includes('.')){
        alert("Username wrong");
        return; // show error on screen
    }
    if (password != repeat){
        alert("password != repeat");
        return; // show error on screen
    }
    const response = await fetch('/register', {
        method: 'POST',
        headers: {
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            email,
            username,
            password
        })
    });

    if (!response.ok)
        return; // show error on screen

    var data = await response.json();
    console.log(data);
    try {
        if (data.Response == 'reload')
            window.location.reload();
        else
            return; // show error on screen
    } catch (err) {

    }
}

document.addEventListener('DOMContentLoaded', () => {
    const highlight = document.getElementById('highlight');
    if (highlight) {
        highlight.style.left = '50%'; // Move the highlight to the "Sign Up" button
    }
});