import { render_mfa } from "./redirect.js";

export async function remove_mfa(what : string){
    const response = await fetch ('/mfa', {
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


export async function change_preferred_mfa(){
    const button = document.getElementById("mfa_update_btn") as HTMLButtonElement;
    if (!button){
        return;
    }
    const selected = document.getElementById("select_mfa") as HTMLSelectElement;
    if (!selected){
        return;
    }
    const value = selected.value;
    const response = await fetch('/change_preferred_mfa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"Value": value}),
    });
    if (!response.ok){
        alert("Could not change your preferred mfa");
        return;
    }
}

(window as any).change_preferred_mfa = change_preferred_mfa;
(window as any).remove_mfa = remove_mfa;