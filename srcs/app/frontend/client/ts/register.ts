// helpers --------------------------------------------------------------


function $input(id: string): HTMLInputElement | null {
    return document.getElementById(id) as HTMLInputElement | null;
  }
  function $(id: string): HTMLElement | null {
    return document.getElementById(id);
  }
  
  function triggerAnimation(field: HTMLElement | null) {
    if (!field) return;
    field.classList.remove('animate-wrong_input');
    void field.offsetWidth;              // reflow → restart animation
    field.classList.add('animate-wrong_input');
  }
  
  // UI error banner ------------------------------------------------------
  
  function wrong_input() {
    const header   = $('error_header');
    const button   = $('login-button');
  
    button?.classList.replace('bg-violet-700', 'bg-red-800');
    header && (header.innerHTML = 'There was an error with your credentials');
  }
  
  // form-field validation ------------------------------------------------
  
  function check_fields(email = '', username = '', password = '', repeat = '') {
    const userField  = $('user_field');
    const userInput  = $input('username');
    const emailField = $('email_field');
    const emailInput = $input('email');
    const passField  = $('password_field');
    const passInput  = $input('password-input');
    const repField   = $('repeat_field');
    const repInput   = $input('password-input2');
  
    wrong_input();
  
    if (!email)   { triggerAnimation(emailField); emailInput?.classList.replace('input_field', 'input_field_error'); }
    else          { emailInput?.classList.replace('input_field_error', 'input_field'); }
  
    if (!username){ triggerAnimation(userField);  userInput?.classList.replace('input_field', 'input_field_error'); }
    else          { userInput?.classList.replace('input_field_error', 'input_field'); }
  
    if (!password){ triggerAnimation(passField);  passInput?.classList.replace('input_field', 'input_field_error'); }
    else          { passInput?.classList.replace('input_field_error', 'input_field'); }
  
    if (!repeat)  { triggerAnimation(repField);   repInput?.classList.replace('input_field', 'input_field_error'); }
    else          { repInput?.classList.replace('input_field_error', 'input_field'); }
  }
  
  
  async function create_account() {
    // //console.log('creating account');
  
    const email    = $input('email')?.value ?? '';
    const username = $input('username')?.value ?? '';
    const password = $input('password-input')?.value ?? '';
    const repeat   = $input('password-input2')?.value ?? '';
  
    if (!email || !username || !password || !repeat) {
      check_fields(email, username, password, repeat);
      return;
    }
    if (!email.includes('@'))          { wrong_input(); return; }
  
    const email_at_pos = email.indexOf('@');
    // const email_name   = email.slice(0, email_at_pos).replace(/\./g, '-');
    const email_domain = email.slice(email_at_pos + 1);
  
    if (!email_domain.includes('.'))   { wrong_input(); return; }
    if (username.includes('.'))        { wrong_input(); return; }
    if (password !== repeat)           { wrong_input(); return; }
  
    const response = await fetch('/register', {
      method : 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body   : JSON.stringify({ email, username, password })
    });
  
    if (!response.ok) { alert('Server error'); return; }
  
    try {
      const data = await response.json();
      if (data.Response === 'reload') window.location.reload();
      else                            alert('Unexpected response:\n' + JSON.stringify(data));
    } catch { /* ignore malformed JSON */ }
  }
  