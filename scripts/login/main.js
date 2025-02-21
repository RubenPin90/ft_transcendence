
async function login() {
  const email = document.getElementById("email-input").value;
  const password = document.getElementById("password-input").value;

  console.log("E-Mail:", email);
  console.log("Passwort:", password);

  if (!email || !password) {
      alert("Bitte Email und Passwort eingeben!");
      return;
  }
  
}