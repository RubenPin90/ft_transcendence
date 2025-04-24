
function prev_next(element : HTMLInputElement, prev : string | null, next : string | null, key : string){
    if (key === "Backspace"){
        console.log("backspace pressed");
        if (element.value.length === 0 && prev)
            document.getElementById(prev)?.focus();
        return;
    }
    if (element.value <= '0' || element.value >= '9')
        return;
    if (element.value.length > 0 && next){
        document.getElementById(next)?.focus();
    }
    if (!next){
       const allInputs = document.querySelectorAll('[data-focus-input-init]');
       const allFilled = Array.from(allInputs).every((input) => {
        const inputElement = input as HTMLInputElement;
        return inputElement.value.length > 0;
       })
       if (allFilled) {
        console.log("everything correct");
       }
    }
}



document.querySelectorAll('[data-focus-input-init]').forEach((element) =>{
    (element as HTMLInputElement).addEventListener('keyup', (event: KeyboardEvent)=>{
        const target = event.target as HTMLInputElement;
        const key = event.key;
        const prev = target.getAttribute("data-focus-input-prev");
        const next = target.getAttribute("data-focus-input-next");
        prev_next(target, prev, next, key);
    });
});