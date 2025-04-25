async function create_account() {
    const email = String(document.getElementById('email').value);
    const username = String(document.getElementById('username').value);
    const password = String(document.getElementById('password').value);
    const repeat = String(document.getElementById('repeat').value);

    if (!email.includes('@')) {
        return; // show error on screen
    }
    const email_at_pos = email.indexOf('@');
    var email_name = email.slice(0, email_at_pos);
    const email_domain = email.slice(email_at_pos + 1);
    email_name = email_name.replace(/\./g, '-');
    if (!email_domain.includes('.'))
        return; // show error on screen
    if (username.includes('.'))
        return; // show error on screen
    if (password != repeat)
        return; // show error on screen
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