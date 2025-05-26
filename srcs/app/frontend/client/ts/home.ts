async function Logout() {
    //console.log("In Logout function");
    
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

    Delete_cookie("token");
    Delete_cookie("lang");
    location.reload();
}

async function Delete_cookie(name : string) {
    document.cookie = name  + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}
