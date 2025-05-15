async function logout() {
    console.log("In Logout function");
    
    try{
        await fetch('/logout',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (err){
        console.error("Error on logout:", err);
    }

    delete_cookie("token");
    delete_cookie("lang");
    location.reload();
}

async function delete_cookie(name) {
    document.cookie = name  + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}
