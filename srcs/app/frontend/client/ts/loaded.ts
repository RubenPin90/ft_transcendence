async function userid() {
    var link = window.location.href;
    link = link.slice(link.indexOf('/') + 1);
    link = link.slice(link.indexOf('/') + 1);
    link = link.slice(link.indexOf('/') + 1);

    // check if google or github
    const response = await fetch('/home', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({link}),
    });
    console.log(response);
    var data;
    try {
        var userid;
        var lang;
        data = await response.json();
        if (data.response == "fail") {
            console.error("error with data");
            return ;
        }
        if (data.response != "success")
            return ;
        // console.log(data);
        userid = data.token;
        lang = data.lang;
        document.cookie = `token=${userid}`;
        document.cookie = `lang=${lang}`;
        history.pushState({}, '', '/');
    } catch (err) {
        console.error(`error in setting cookies: ${err}`);
    }
};


if (location.href.startsWith("https://localhost/?code=")) {
    userid();
}