"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function add_friend() {
    return __awaiter(this, void 0, void 0, function* () {
        const input = document.getElementById('accept_friends');
        if (!input || input === undefined) {
            alert('no input elemetn');
            return;
        }
        const input_value = input.value;
        if (input_value === '') {
            alert('input should not be empty');
            return;
        }
        try {
            const response = yield fetch('/add_friends', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input_value }),
            });
            if (!response.ok) {
                alert("response is not ok in add_friend");
                return;
            }
        }
        catch (err) {
            console.error("Error on add_friends:", err);
        }
    });
}
function accept_friend(userid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('/accept_friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userid }),
            });
            if (!response.ok) {
                alert("response is not ok in accept_friend");
                return;
            }
        }
        catch (err) {
            console.error("Error on accept_friend:", err);
        }
        var block = document.getElementById(`request-${userid}`);
        block === null || block === void 0 ? void 0 : block.remove();
    });
}
function reject_friend(userid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('/reject_friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userid }),
            });
            if (!response.ok) {
                alert("response is not ok in reject_friend");
                return;
            }
        }
        catch (err) {
            console.error("Error on reject_friend:", err);
        }
        var block = document.getElementById(`request-${userid}`);
        block === null || block === void 0 ? void 0 : block.remove();
    });
}
function block_friend(userid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('/block_friend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userid }),
            });
            if (!response.ok) {
                alert("response is not ok in block_friend");
                return;
            }
        }
        catch (err) {
            console.error("Error on block_friend:", err);
        }
        var block = document.getElementById(`request-${userid}`);
        block === null || block === void 0 ? void 0 : block.remove();
    });
}
