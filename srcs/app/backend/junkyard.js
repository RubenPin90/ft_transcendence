async function frontend_login() {
    const parsed = await utils.process_login(request, response);
    if (!parsed || parsed === undefined)
        return `1_${parsed}`;
    else if (parsed < 0) {
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        if (parsed == -1)
            response.raw.end(JSON.stringify({"Response": 'Error', "Content": 'Wrong email'}));
        else if (parsed == -2)
            response.raw.end(JSON.stringify({"Response": 'Error', "Content": 'Wrong password'}));
        return true;
    }
}