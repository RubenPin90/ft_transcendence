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
    var Value: number = 0;

    switch(preferred){
        case "1":
            Value = 1;
            break;
        case "2":
            Value = 2;
            break;
        case "3":
            Value = 3;
            break;
        default:
            break;
    }

    const response = await fetch('/change_preferred_mfa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(Value)
    })
    
}

async function get_preferred_mfa(){
    const button = document.getElementById("mfa_update_btn") as HTMLButtonElement;
    if (button){
        console.log("Button found");
        const selected = document.getElementById("select_mfa") as HTMLSelectElement;
        console.log("Selected:::", selected);
        if (!selected){
            return;
        }
        console.log("selected found");
        const value = selected.value;
        alert(`value::::${value}`);
        await change_preffered_mfa(value);
    }
}
