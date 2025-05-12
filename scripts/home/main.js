async function logout() {
    delete_cookie("token");
    delete_cookie("lang");
    location.reload();
}

async function delete_cookie(name) {
    document.cookie = name  + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}
