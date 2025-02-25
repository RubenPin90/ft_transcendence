
async function login() {
  const email = document.getElementById("email-input").value;
  const password = document.getElementById("password-input").value;

  if (!email || !password) {
      alert("Bitte Email und Passwort eingeben!");
      return;
  }

  const response = await fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({email, password}),
  });

  console.log(response);
}