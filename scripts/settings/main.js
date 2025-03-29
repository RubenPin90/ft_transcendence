async function create_otc() {
    try {
        const response = await fetch('/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({"Function": "create_otc"}),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            throw new Error('Fehler beim Parsen der JSON-Antwort');
        }

        const qrcodeDiv = document.getElementById('mfa');
        const qrcodeButtonDiv = document.getElementById('mfa-button');
        if (qrcodeDiv && qrcodeButtonDiv) {
            qrcodeDiv.innerHTML = `<img src=${data}></p>`;
            qrcodeButtonDiv.innerHTML = '<input id="Code" name="Code" placeholder="Code"></label> <button onclick="verify_code()">Verify</button> <button onclick="window.location.reload()">Back</button>';
        }

    } catch (error) {
        console.error('Fehler bei create_otc:', error.message);
        throw error;
    }
}

async function verify_code() {
    const code = document.getElementById('Code');
    if (!code.value) {
        alert("Error. Input cant be empty");
        return;
    }
    console.log(code.value);
    const response = await fetch('/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"Function": "verify", "Code": code.value}),
    });
    if (!response.ok) {
        throw new Error(`HTTP Fehler! Status: ${response.status}`);
    }

    let data;
    try {
        data = await response.json();
        if (data.Response !== "Success")
            alert("Error: 2FA code invalid");
        // else
        //     clear window and replace with nice UI Box. Client success
    } catch (jsonError) {
        throw new Error('Fehler beim Parsen der JSON-Antwort');
    }
    console.log(data);
}

async function verify_custom_code() {
    console.log('hi');
    const qrcodeButtonDiv = document.getElementById('mfa-button');
    if (qrcodeButtonDiv) {
        qrcodeButtonDiv.innerHTML = '<input id="Code" name="Code" placeholder="Code"><br>\
        <button onclick="create_custom_code()">Next</button> <button onclick="window.location.reload()">Back</button>';
    }
}

async function create_custom_code(variable) {
    console.log(variable);
    const qrcodeButtonDiv = document.getElementById('mfa-button');
    if (qrcodeButtonDiv) {
        qrcodeButtonDiv.innerHTML = '<input id="Code" name="Code" placeholder="Code"><br>\
        <button onclick="create_custom_code(\"H\")">Next</button> <button onclick="window.location.reload()">Back</button>';
    }
    console.log("lol");
    // const result = fetch('/settings', {
    //     method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //     body: JSON.stringify({"Function": "create_custom_code"}),
    // });

    // // if (!result.ok) {
    // //     throw new Error(`HTTP Fehler! Status`); 
    // // }

    // let data;
    // try {
    //     data = await response.json();
    //     if (data.Response !== "Success")
    //         alert("Error: 2FA code invalid");
    // } catch (jsonError) {
    //     throw new Error('Fehler beim Parsen der JSON-Antwort');
    // }
}

async function logout() {
    delete_cookie("token");
    location.reload();
}

async function delete_cookie(name) {
    document.cookie = name  + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}