import { render_mfa } from "./redirect.js";

async function remove_mfa(what : string){
    const response = await fetch ('/mfa',{
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"Function": what}),
    });

    if (!response.ok){
        alert("ERROR WITH REMOVE");
    }
    const data = await response.json();
    if (data.Response === "success"){
        alert(`SUCCESSFULLY REMOVED ${what}`);
        render_mfa();
    };

}

async function change_preffered_mfa(preferred: string){

    const response = await fetch('/change_preferred_mfa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"Value": preferred}),
    });
    
}

async function get_preferred_mfa(){
    const button = document.getElementById("mfa_update_btn") as HTMLButtonElement;
    if (button){
        const selected = document.getElementById("select_mfa") as HTMLSelectElement;
        if (!selected){
            return;
        }
        const value = selected.value;
        await change_preffered_mfa(value);
    }
}
