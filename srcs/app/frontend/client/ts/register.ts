// helpers --------------------------------------------------------------


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
  void field.offsetWidth;              // reflow → restart animation
  field.classList.add('animate-wrong_input');
}
  
  // UI error banner ------------------------------------------------------
  
function wrong_input(error : string) {
  const header   = GetElement('error_header');
  // const button   = $('login-button');

  // button?.classList.replace('bg-violet-700', 'bg-red-800');
  header && (header.innerHTML = `There was an error with your credentials<br>${error}`);
}
  
  // form-field validation ------------------------------------------------
  
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
  const email    = GetInput('email_SignUp')?.value ?? '';
  const username = GetInput('username_SignUp')?.value ?? '';
  const password = GetInput('password-input_SignUp')?.value ?? '';
  const repeat   = GetInput('password-input2_SignUp')?.value ?? '';


  if (!email || !username || !password || !repeat) {
    check_fields(email, username, password, repeat);
    return;
  }

  if (parse_email(email) === false){
    return wrong_input("Invalid Email");
  }
  if (password !== repeat){
    return wrong_input("Passwords are not the same");
  }

  const response = await fetch('/register', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({email, username, password})
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
    }
  } catch { /* ignore malformed JSON */ }

  console.log("AAAAAA");
  const response2 = await fetch('/get_data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      "get" : "site_content"
    }),
  });
  console.log("BBBBBB");


  try {
    const data2 = await response2.json();
    const content = data2.Content;
    const content2 = content.getElementById("main_body");
    console.log(content2);
    var current_file = document.getElementById("main_body");
    if (!current_file || !content2)
      return ;
    current_file.innerHTML = content2.innerHTML;
  } catch (err) {
    console.error(`Error with redirect: ${err}`);
  }
}