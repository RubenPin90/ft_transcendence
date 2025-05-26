"use strict";
function prev_next(element, prev, next, key) {
    var _a, _b;
    if (key === "Backspace") {
        if (element.value.length === 0 && prev)
            (_a = document.getElementById(prev)) === null || _a === void 0 ? void 0 : _a.focus();
        return;
    }
    if (element.value <= '0' || element.value >= '9')
        return;
    if (element.value.length > 0 && next) {
        (_b = document.getElementById(next)) === null || _b === void 0 ? void 0 : _b.focus();
    }
    if (!next) {
        const allInputs = document.querySelectorAll('[data-focus-input-init]');
        const allFilled = Array.from(allInputs).every((input) => {
            const inputElement = input;
            return inputElement.value.length > 0;
        });
        if (allFilled) {
        }
    }
}
document.querySelectorAll('[data-focus-input-init]').forEach((element) => {
    element.addEventListener('keyup', (event) => {
        const target = event.target;
        const key = event.key;
        const prev = target.getAttribute("data-focus-input-prev");
        const next = target.getAttribute("data-focus-input-next");
        prev_next(target, prev, next, key);
    });
});
