// helpers --------------------------------------------------------------


function $input(id: string): HTMLInputElement | null {
  const input = document.getElementById(id) as HTMLInputElement;
  if (!input)
    return null;
  return  input;
}

function $(id: string): HTMLElement | null {
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
  const header   = $('error_header');
  const button   = $('login-button');

  button?.classList.replace('bg-violet-700', 'bg-red-800');
  header && (header.innerHTML = `There was an error with your credentials<br>${error}`);
}
  
  // form-field validation ------------------------------------------------
  
function check_fields(email : string, username : string, password : string, repeat : string) {
  const userField  = $('user_field');
  const userInput  = $input('username_SignUp');
  const emailField = $('email_field');
  const emailInput = $input('email_SignUp');
  const passField  = $('password_field');
  const passInput  = $input('password-input_SignUp');
  const repField   = $('repeat_field');
  const repInput   = $input('password-input2_SignUp');

  wrong_input('');

  if (!email) {
    triggerAnimation(emailField); emailInput?.classList.replace('input_field', 'input_field_error');
  } else {
    emailInput?.classList.replace('input_field_error', 'input_field');
  }

  if (!username) {
    triggerAnimation(userField);  userInput?.classList.replace('input_field', 'input_field_error');
  } else {
    userInput?.classList.replace('input_field_error', 'input_field');
  }

  if (!password) {
    triggerAnimation(passField);  passInput?.classList.replace('input_field', 'input_field_error');
  } else {
    passInput?.classList.replace('input_field_error', 'input_field');
  }

  if (!repeat) {
    triggerAnimation(repField);   repInput?.classList.replace('input_field', 'input_field_error');
  } else {
    repInput?.classList.replace('input_field_error', 'input_field');
  }
}
  
  
async function create_account() {
  const email    = $input('email_SignUp')?.value ?? '';
  const username = $input('username_SignUp')?.value ?? '';
  const password = $input('password-input_SignUp')?.value ?? '';
  const repeat   = $input('password-input2_SignUp')?.value ?? '';

  console.log(email, username, password, repeat);

  if (!email || !username || !password || !repeat) {
    check_fields(email, username, password, repeat);
    return;
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
      // alert('Unexpected response:\n' + JSON.stringify(data.Response));
    }
  } catch { /* ignore malformed JSON */ }
}