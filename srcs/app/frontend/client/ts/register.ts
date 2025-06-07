// helpers --------------------------------------------------------------
import {connect} from './socket.js'


function parse_emaiL(email : string) : boolean {
    const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    return regex.test(email);
}


function GetInput(id: string): HTMLInputElement | null {
  const input = document.getElementById(id) as HTMLInputElement;
  if (!input)
    return null;
  return  input;
}

function GetElement(id: string): HTMLElement | null {
    return document.getElementById(id);
}
  
function triggerAnimation(field: HTMLElement | null) {
  if (!field)
    return;
  field.classList.remove('animate-wrong_input');
  void field.offsetWidth;
  field.classList.add('animate-wrong_input');
}
  
  
function wrong_input(error : string) {
  const header   = GetElement('error_header');
  header && (header.innerHTML = `There was an error with your credentials<br>${error}`);
}
  
function check_fields(email : string, username : string, password : string, repeat : string) {
  const userField  = GetElement('user_field');
  const userInput  = GetInput('username_SignUp');
  const emailField = GetElement('email_field');
  const emailInput = GetInput('email_SignUp');
  const passField  = GetElement('password_field');
  const passInput  = GetInput('password-input_SignUp');
  const repField   = GetElement('repeat_field');
  const repInput   = GetInput('password-input2_SignUp');

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

async function create_account() {
  const email = GetInput('email_SignUp')?.value ?? '';
  const username = GetInput('username_SignUp')?.value ?? '';
  const password = GetInput('password-input_SignUp')?.value ?? '';
  const repeat = GetInput('password-input2_SignUp')?.value ?? '';

  if (!email || !username || !password || !repeat) {
    check_fields(email, username, password, repeat);
    return;
  }
  if (parse_emaiL(email) === false){
    return wrong_input("Invalid Email");
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
  const blob = await picture.blob();    //Gets the raw binary data of the image

  const base64 = await new Promise<string | void>((resolve, reject) => {
    const file = new FileReader();      //A built-in browser API for reading files (like images).
    file.onloadend = () => {            // This function runs when the file has finished reading.
      pfp = file.result as string;      //Inside this, you assign the result to pfp
      resolve();                        // Then call resolve() to say “we’re done, continue the await”
    };
    file.onerror = reject;
    file.readAsDataURL(blob);           // Tells the reader to convert the binary blob into a Base64-encoded data URL
  })
  const response = await fetch('/register', {
    method : 'POST',  
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({email, username, password, pfp})
  });

  if (!response.ok) {
    alert('Server error');
    return;
  }
  try {
    const data = await response.json();
    if (data.Response === 'reload') 
      window.location.reload();
    else if (data.Response !== 'success'){
      wrong_input(data.Response);
      return;
    }
  } catch (err) {
      console.error(`error with register: ${err}`);
      alert(`error with register: ${err}`);
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
    // const content2value = content2[1].trim();
    var current_file = document.getElementById("main_body");
    if (!current_file)
      return ;
    // current_file.innerHTML = content2value;
    current_file.innerHTML = content2[1];
    // window.history.pushState({}, '', '/');
    window.location.replace('/');
    await connect();
  } catch (err) {
    console.error(`Error with redirect Signup: ${err}`);
    return;
  }
}

(window as any).create_account = create_account;