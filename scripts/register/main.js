
function wrong_input(){
    // let span = document.getElementById("input_error");
    let header = document.getElementById("error_header");
    let button = document.getElementById("login-button");
    
    button.classList.replace("bg-violet-700", "bg-red-800")
    // button.classList.replace("hover:bg-violet-800", "cursor-not-allowed")
    header.innerHTML = "There was an errors with your credentials"
    // span.innerHTML = error_message;
}

function check_fields(email, username, password, repeat){
    let user_field = document.getElementById("user_field");
    let user_inner = document.getElementById("username");
    let email_field = document.getElementById("email_field");
    let email_inner = document.getElementById("email");
    let pass_field = document.getElementById("password_field");
    let pass_inner = document.getElementById("password-input")
    let rep_field = document.getElementById("repeat_field");
    let rep_inner = document.getElementById("password-input2")

    function trigger_animation(field){
        field.classList.remove("animate-wrong_input");
        void field.offsetWidth;
        field.classList.add("animate-wrong_input")
    }

    wrong_input();
    if (!email){
        trigger_animation(email_field);
        email_inner.classList.replace("input_field", "input_field_error");
    } else if(email){
        email_inner.classList.replace("input_field_error", "input_field");
    }
    if (!username){
        trigger_animation(user_field);
        user_inner.classList.replace("input_field", "input_field_error");
    } else if (username){
        user_inner.classList.replace("input_field_error", "input_field");
    }
    if (!password){
        trigger_animation(pass_field);
        pass_inner.classList.replace("input_field", "input_field_error");
    } else if (password){
        pass_inner.classList.replace("input_field_error", "input_field");
    }
    if (!repeat){
        trigger_animation(rep_field)
        rep_inner.classList.replace("input_field", "input_field_error");
    } else if (repeat){
        rep_inner.classList.replace("input_field_error", "input_field");
    }
    return;
}


async function create_account() {
    console.log("creating account");
    const email = String(document.getElementById('email').value);
    const username = String(document.getElementById('username').value);
    const password = String(document.getElementById('password-input').value);
    const repeat = String(document.getElementById('password-input2').value);
    
    if (!email || !username || !password || !repeat)
    {
        check_fields(email, username, password, repeat);
        return;
    }
    if (!email.includes('@')) {
        wrong_input();
        return; // show error on screen
    }
    const email_at_pos = email.indexOf('@');
    var email_name = email.slice(0, email_at_pos);
    const email_domain = email.slice(email_at_pos + 1);
    email_name = email_name.replace(/\./g, '-');
    if (!email_domain.includes('.')){
        wrong_input();
        return; // show error on screen
    }
    if (username.includes('.')){
        wrong_input();
        return; // show error on screen
    }
    if (password != repeat){
        wrong_input();
        return; // show error on screen
    }

    // Here change the route of the fetch
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

    if (!response.ok){
        alert("error with response");
        return; // show error on screen
    }

    var data = await response.json();
    console.log(data);
    try {
        if (data.Response == 'reload')
            window.location.reload();
        else{
            alert("error line 113");
            console.log(data);
            return; // show error on screen
        }
    } catch (err) {

    }
}
