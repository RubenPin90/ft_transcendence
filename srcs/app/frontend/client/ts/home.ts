async function Log_out() {
    //console.log("In Logout function");
    
    try{
        const respsone = await fetch('/logout',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
            credentials: 'same-origin'
        });
    } catch (err){
        console.error("Error on logout:", err);
    }

    location.reload();
}

async function Delete_cookie(name : string) {
    document.cookie = name  + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// window.addEventListener('DOMContentLoaded', () => {
//     document.getElementById('logout-btn')?.addEventListener('click', Logout);
// });