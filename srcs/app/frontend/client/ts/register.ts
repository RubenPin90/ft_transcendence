import {connect} from './socket.js'

function parse_emaiL(email : string) : boolean {
    const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    return regex.test(email);
}

function getValue(id: string): string {
  const element = document.getElementById(id) as HTMLInputElement;
  if (element){
    return element.value;
  }
  return '';
}
  
function triggerAnimation(field: HTMLElement | null) {
  if (!field)
    return;
  field.classList.remove('animate-wrong_input');
  void field.offsetWidth;
  field.classList.add('animate-wrong_input');
}

function parse_username(username: string): boolean{
  const uname_RE = /^[A-Za-z0-9_.-]{3,}$/;
  return uname_RE.test(username);
}

function wrong_input(error : string) {
  const header = document.getElementById('error_header');
  if (header){
    header.innerHTML = `There was an error with your credentials<br>${error}`;
  }
}

function check_fields(email : string, username : string, password : string, repeat : string) {
  const userField  = document.getElementById('user_field');
  const emailField = document.getElementById('email_field');
  const passField  = document.getElementById('password_field');
  const repField   = document.getElementById('repeat_field');

  const userInput  = document.getElementById('username_SignUp') as HTMLInputElement;
  const emailInput = document.getElementById('email_SignUp') as HTMLInputElement;
  const passInput  = document.getElementById('password-input_SignUp') as HTMLInputElement;
  const repInput   = document.getElementById('password-input2_SignUp') as HTMLInputElement;

  if (!userField || !userInput || !emailField || !emailInput || !passField || !passInput || !repField || !repInput){
    return;
  }

  wrong_input('');

  if (!email) {
    triggerAnimation(emailField);
    emailInput.classList.replace('input_field', 'input_field_error');
  } else {
    emailInput.classList.replace('input_field_error', 'input_field');
  }

  if (!username) {
    triggerAnimation(userField);
    userInput.classList.replace('input_field', 'input_field_error');
  } else {
    userInput.classList.replace('input_field_error', 'input_field');
  }

  if (!password) {
    triggerAnimation(passField);
    passInput.classList.replace('input_field', 'input_field_error');
  } else {
    passInput.classList.replace('input_field_error', 'input_field');
  }

  if (!repeat) {
    triggerAnimation(repField);
    repInput.classList.replace('input_field', 'input_field_error');
  } else {
    repInput.classList.replace('input_field_error', 'input_field');
  }
}

export async function create_account() {
  const email = getValue('email_SignUp');
  const username = getValue('username_SignUp');
  const password = getValue('password-input_SignUp');
  const repeat = getValue('password-input2_SignUp');

  if (!email || !username || !password || !repeat) {
    check_fields(email, username, password, repeat);
    return;
  }
  if (parse_emaiL(email) === false){
    return wrong_input("Invalid Email");
  }
  if (parse_username(username) === false){
    return wrong_input("Invalid username. Username has to be at least 3 characters and allowed are A-Z,a-z,0-9,'_.-'");
  }
  if (parse_username(password) === false){
    return wrong_input("Invalid password. password has to be at least 3 characters and allowed are A-Z,a-z,0-9,'_.-'");
  }
  if (password.length < 3){
    return wrong_input("Password is too short at least 3 characters");
  }
  if (password !== repeat){
    return wrong_input("Passwords are not the same");
  }
  if (username.length > 10){
    return wrong_input("username is too long max allowed 10 characters");
  }

  let pfp = '';
  const picture = await fetch('/public/default_profile.svg');
  if (!picture.ok){
    alert("Server Error creating user please contact Staff?");
    return;
  }
  const blob = await picture.blob();

  pfp = await new Promise<string>( (resolve, reject) => {
    const read = new FileReader();
    read.readAsDataURL(blob);
    read.onerror = () =>{
      alert("Error setting up default profile picture");
      reject;
    }
    read.onload = () =>{
      pfp = read.result as string;
      resolve(pfp);
    }
  })

  const response = await fetch('/register', {
    method : 'POST',  
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({email, username, password, pfp})
  });

  try {
    const data = await response.json();
    if (data.Response !== 'success'){
      wrong_input(data.Response);
      return;
    }
  } catch (err) {
      console.error(`error with register: ${err}`);
      return;
  }

  const response2 = await fetch('/get_data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      "get" : "site_content"
    }),
  });


  try {
    const data2 = await response2.json();
    const content = data2.Content;

    const content2 = content.match(/<body class="background" id="main_body">([\s\S]*?)<\/body>/);
    var current_file = document.getElementById("main_body");
    if (!current_file)
      return ;
    current_file.innerHTML = content2[1];
    history.replaceState({}, '', '/');
    try {
      await connect();
    } catch (err) {
      console.error('WS failed to connect', err);
    }
  } catch (err) {
    console.error(`Error with redirect Signup: ${err}`);
    return;
  }
}

(window as any).create_account = create_account;