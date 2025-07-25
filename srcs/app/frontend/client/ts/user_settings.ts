import { handleRouteChange } from "./redirect.js";

const eye_Closed : string = `<svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z" /><path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z" /><path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z" /></svg>`;
const eye_Open : string = `<svg class="w-6 h-6 text-gray-500 justify-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clip-rule="evenodd" /></svg>`;


function eye_one(){
    const eye = document.getElementById("password_eye_settings");
    const passwordInput = document.getElementById("password_input_change") as HTMLInputElement;

    if (eye && passwordInput){
        if (passwordInput.type === "password"){
            passwordInput.type = "text";
            eye.innerHTML = eye_Open;
        } else {
            passwordInput.type = "password";
            eye.innerHTML = eye_Closed;
        }
    }
}

function eye_two(){
    const eye = document.getElementById("password_eye2_settings");
    const passwordInput = document.getElementById("password_input2_change") as HTMLInputElement;

    if (eye && passwordInput){
        if (passwordInput.type === "password"){
            passwordInput.type = "text";
            eye.innerHTML = eye_Open;
        } else {
            passwordInput.type = "password";
            eye.innerHTML = eye_Closed;
        }
    }
}

function toggle_eye(num : number){
    switch (num){
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
            return ;
    }
}

async function change_user(){
    const usernameField = document.getElementById('username_sett') as HTMLInputElement;
    try{
        const usernameValue = usernameField.value;
        if (!usernameValue){
            alert("please enter a username");
            return;
        }
        const response = await fetch('/update_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({usernameValue}),
        });
        const result = await response.json();
        if (response.ok){
            alert("update was successfull");
        }else{
            alert("Error: " + result.Response);
        }
        var name_field = document.getElementById("welcome-user-field");
        var value = name_field?.innerHTML;
        var splited = value?.split('<br>');
        if (!splited || !name_field)
            return;
        name_field.innerHTML = `${splited[0]}<br>${usernameValue}`;
        history.pushState({}, '', '/settings/user');
        handleRouteChange();
    }
    catch (err){
        console.error("error with update: " + err);
        alert("error with update");
    };
};

async function change_logindata(){
    const passField = document.getElementById('password_input_change') as HTMLInputElement;
    const repField = document.getElementById('password_input2_change') as HTMLInputElement;
    
    const passValue = passField.value;
    const repValue = repField.value;

    const value_struct = {
        password: passValue,
        avatar: null
    }

    if (passValue !== repValue){
        alert("password is not equal to repeat password");
        return;
    }
    
    try{
        const response = await fetch('/update_settings', {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/json'
            },
            body: JSON.stringify(value_struct)
        });
        if (response.ok){
            alert("Success");
            history.pushState({}, '', '/settings/user');
            handleRouteChange();
        }
    }
    catch(err){
        console.error('Error updating logindata: ', err);
    }
}

async function change_avatar(){
    const avatar_field = document.getElementById("dropzone-file") as HTMLInputElement;

    if (!avatar_field || !avatar_field.files || !avatar_field.files[0]){
        alert("No file selected");
        return;
    }
    const file = avatar_field.files[0];
    
    const read = new FileReader();
    read.readAsDataURL(file);
    read.onload = async () => {
        const base64 = read.result as string;
        const value_struct = {
            password: '',
            avatar: base64
        }
        
        try{
            const response = await fetch('/update_settings', {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/json'
            },
            body: JSON.stringify(value_struct)
        });
        if (!response.ok){
            alert("error updating avatar");
            return;
        } else{
            alert("success");
            history.pushState({}, '', '/settings/user');
            handleRouteChange();
        }
        } catch(err) {
            console.error('Error updating avatar: ', err);
        }
    };
    read.onerror = () => {
        console.error("Read file failed");
        alert("could not change avatar");
    }
}

(window as any).change_logindata = change_logindata;
(window as any).change_avatar = change_avatar;
(window as any).change_user = change_user;
(window as any).toggle_eye = toggle_eye;