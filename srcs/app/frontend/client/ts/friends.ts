async function add_friend(){
    const input = document.getElementById('accept_friends') as HTMLInputElement;
    if (!input || input === undefined){
        alert('no input element');
        return;
    }
    const input_value = input.value;
    if (input_value === ''){
        alert('input should not be empty');
        return;
    }

    try{
        const response = await fetch('/add_friends',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({input_value}),
        });
        if (!response.ok){
            alert("response is not ok in add_friend");
            return;
        }
        const data = await response.json();
        if (data.Response == "success"){
            alert("Friend request sent");
            return;
        }
    } catch (err){
        console.error("Error on add_friends:", err);
    }
}

async function accept_friend(userid : string){
    try{
        const response = await fetch('/accept_friends',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({userid}),
        });
        if (!response.ok){
            alert("response is not ok in accept_friend");
            return;
        }
    } catch (err){
        console.error("Error on accept_friend:", err);
    }
    var block = document.getElementById(`request-${userid}`);
    block?.remove();
}

async function reject_friend(userid:string) {
    try{
        const response = await fetch('/reject_friend',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({userid}),
        });
        if (!response.ok){
            alert("response is not ok in reject_friend");
            return;
        }
    } catch (err){
        console.error("Error on reject_friend:", err);
    }
    var block = document.getElementById(`request-${userid}`);
    block?.remove();
}
