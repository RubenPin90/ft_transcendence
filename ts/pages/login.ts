export async function renderLogin() : Promise<string>
{
    const res = await fetch('/views/login.html');
    const ret = await res.text();
    return ret;
}