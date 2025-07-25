import { disconnect } from "./socket.js";

export async function Log_out() {
    try{
        const response = await fetch('/logout',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
            credentials: 'same-origin'
        });
        
        const new_page = await fetch('/get_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "get": "login_html",
            }),
        });

        const content_all = await new_page.text();
        const field = document.getElementById("main_body");
        if (!field){
            return;
        }
        const content = content_all.match(/<body class="background" id="main_body">([\s\S]*?)<\/body>/);
        if (!content){
            return;
        }
        field.innerHTML = content[1];
        await disconnect();
        if (localStorage.getItem('playerId'))
            localStorage.removeItem('playerId')
        if (localStorage.getItem('currentRoomId'))
            localStorage.removeItem('currentRoomId')
        window.location.replace('/login');
    } catch (err){
        console.error("Error on logout:", err);
    }

    history.replaceState(null, '', '/login');
}

async function Delete_cookie(name : string) {
    document.cookie = name  + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

(window as any).Log_out = Log_out;