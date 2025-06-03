async function remove_mfa(what : string){
    console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    const response = await fetch ('/mfa',{
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({"Function": what}),
    });

    if (!response.ok){
        alert("ERROR WITH REMOVE");
    }
    const data = await response.json();
    if (data.Response === "Success"){
        alert(`SUCCESSFULLY REMOVED ${what}`);
        render_mfa();
    };

}