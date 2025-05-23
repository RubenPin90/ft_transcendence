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
function Logout() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("In Logout function");
        try {
            yield fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
        catch (err) {
            console.error("Error on logout:", err);
        }
        Delete_cookie("token");
        Delete_cookie("lang");
        location.reload();
    });
}
function Delete_cookie(name) {
    return __awaiter(this, void 0, void 0, function* () {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });
}
