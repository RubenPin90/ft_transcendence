import * as modules from './modules.js';
import * as utils from './utils.js';
import * as send from './responses.js';
import * as translator from './translate.js'
import * as settings_db from './database/db_settings_functions.js';
import * as users_db from './database/db_users_functions.js';
import * as mfa_db from './database/db_mfa_functions.js';
import qrcode from 'qrcode';
import { json } from 'stream/consumers';

async function login(request, response) {
    const check_login = utils.check_login(request, response);
    if (check_login === true)
        return true;
    if (request.method === "POST") {
        const parsed = await utils.process_login(request, response);
        if (!parsed || parsed === undefined)
            return `1_${parsed}`;
        else if (parsed < 0) {
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            if (parsed == -1)
                response.end(JSON.stringify({"Response": 'Error', "Content": 'Wrong email'}));
            else if (parsed == -2)
                response.end(JSON.stringify({"Response": 'Error', "Content": 'Wrong password'}));
            return true;
        }
        if (parsed.mfa && parsed.mfa.email && !parsed.mfa.email.endsWith('_temp') && parsed.mfa.prefered === 1) {
            var email_code = Math.floor(Math.random() * 1000000);
            const email_code_len = 6 - (String(email_code).length);
            for (var pos = 0; pos < email_code_len; pos++)
                email_code = '0' + email_code;
            await modules.send_email(parsed.settings.email, 'MFA code', `This is your 2FA code. Please do not share: ${email_code}`);
            email_code = await modules.create_encrypted_password(String(email_code));
            await mfa_db.update_mfa_value('email', email_code, parsed.mfa.self);
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.end(JSON.stringify({"Response": 'send_email_verification', "Content": parsed.settings.self}));
            return true;
        } else if (parsed.mfa && parsed.mfa.otc && !parsed.mfa.otc.endsWith('_temp') && parsed.mfa.prefered === 2) {
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.end(JSON.stringify({"Response": 'send_2FA_verification', "Content": parsed.settings.self}));
            return true;
        } else if (parsed.mfa && parsed.mfa.custom && !parsed.mfa.custom.endsWith('_temp') && parsed.mfa.prefered === 3) {
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.end(JSON.stringify({"Response": 'send_custom_verification', "Content": parsed.settings.self}));
            return true;
        }
        const token = modules.create_jwt(parsed.settings.self, '1h');
        if (!token || token === undefined || token < 0)
            return `2_${token}`;
        const lang = modules.create_jwt(parsed.settings.lang, '1h');
        if (!lang || lang === undefined || lang < 0)
            return `3_${lang}`;

        modules.set_cookie(response, 'token', token, true, true, 'strict');
        modules.set_cookie(response, 'lang', lang, true, true, 'strict');
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'reload', "Content": null}));
        return true;
    }
    if (!check_login || check_login === undefined || check_login < -1)
        return `4_${check_login}`;
    await send.send_html('login.html', response, 200, async (data) => {
        const google_link = utils.google_input_handler();
        data = data.replace("{{google_login}}", google_link);
        const github_link = utils.github_input_handler();
        return data.replace("{{github_login}}", github_link);
    });
    return true;
}

async function register(request, response) {
    const check_login = utils.check_login(request, response);
    if (check_login === true)
        return true;
    if (request.method == 'POST') {
        const replace_data = await utils.get_frontend_content(request);
        const check_settings = await settings_db.get_settings_value('email', replace_data.email);
        if (check_settings || check_settings !== undefined) {
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            response.end(JSON.stringify({"Response": 'User already exists', "Content": null}));
            return true;
        }
        const hashed = await modules.create_encrypted_password(replace_data.password);
        if (!hashed || hashed === undefined || hashed < 0)
            return `1_${hashed}`;
        const settings = await settings_db.create_settings_value(hashed, '', 0, replace_data.email, 'en', '', '');
        if (!settings || settings === undefined || settings < 0)
            return `2_${settings}`;
        const user = await users_db.create_users_value(0, replace_data.username, settings.self);
        if (!user || user === undefined || user < 0) {
            await settings_db.delete_settings_value(settings.self);
            return `3_${user}`;
        }
        console.log(parsed.settings);
        const token = modules.create_jwt(settings.self, '1h');
        if (!token || token === undefined || token < 0)
            return `4_${token}`;
        const lang = modules.create_jwt(parsed.settings.lang, '1h');
        if (!lang || lang === undefined || lang < 0)
            return `5_${lang}`;
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
        modules.set_cookie(response, 'lang', lang, true, true, 'strict');
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'reload', "Content": null}));
        return true;
    }
    if (!check_login || check_login === undefined || check_login < -1)
        return `6_${check_login}`;
    const check = await send.send_html('register.html', response, 200, async (data) => {
        const google_link = utils.google_input_handler();
        data = data.replace("{{google_login}}", google_link);
        const github_link = utils.github_input_handler();
        return data.replace("{{github_login}}", github_link);
    })
    return check;
}

async function home(request, response) {
    var [keys, values] = modules.get_cookies(request.headers.cookie);
    if (request.url === '/' && !keys?.includes('token'))
        return send.redirect(response, '/login', 302);
    if (request.url !== '/' && !request.url.includes('&state=')) {
        const data = await utils.encrypt_google(request);
        if (data < 0) {
            return `1_${data}`;
        }
        const check_settings = await settings_db.get_settings_value('self', data);
        if (!check_settings || check_settings === undefined || check_settings < 0)
            return `2_${check_settings}`;
        const token = modules.create_jwt(data, '1h');
        if (!token || token === undefined || token < 0)
            return `3_${token}`
        const lang = modules.create_jwt(check_settings.lang, '1h');
        if (!lang || lang === undefined || lang < 0)
            return `4_${lang}`;

        modules.set_cookie(response, 'token', token, true, true, 'strict');
        modules.set_cookie(response, 'lang', lang, true, true, 'strict');
		send.redirect(response, '/', 302);
        return true;
    } else if (request.url !== '/') {
        const data = await utils.encrypt_github(request, response);
        if (data < 0) {
            return `5_${data}`;
        }
        const token = modules.create_jwt(data, '1h');
        if (!token || token === undefined || token < 0)
            return `6_${token}`
        const lang = modules.create_jwt(check_settings.lang, '1h');
        if (!lang || lang === undefined || lang < 0)
            return `7_${lang}`;
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
        modules.set_cookie(response, 'lang', lang, true, true, 'strict');
		send.redirect(response, '/', 302);
        return true;
    }
    const check = await send.send_html('home.html', response, 200, async (data) => {
        var [keys, values] = modules.get_cookies(request.headers.cookie);
        console.log(keys, values);
        const token_check = keys?.find((key) => key === 'token');
        if (!token_check || token_check === undefined || token_check == false)
            return false;
        const lang_check = keys?.find((key) => key === 'lang');
        if (!lang_check || lang_check === undefined || lang_check == false)
            return false;
        const tokenIndex = keys.indexOf('token');
        const token = values[tokenIndex];
        const langIndex = keys.indexOf('lang');
        const lang = values[langIndex];
        try {
            var decoded_token = modules.get_jwt(token);
            var decoded_lang = modules.get_jwt(lang);
        } catch (err) {
            return false;
        }
        const replace_data = await users_db.get_users_value('self', decoded_token.userid);
        if (!replace_data)
            return false;
        console.log(decoded_lang);
        if (decoded_lang.userid !== 'en') {
            data = data.replace("Welcome home user {{userid}}", await translator.find_translation("Welcome home user {{userid}}", decoded_lang.userid));
        }
        // EC sets the user status to online
        // await users_db.update_users_value('status', 1, decoded.userid);

        return data.replace("{{userid}}", replace_data.username);
    });
    if (!check || check === undefined || check == false)
        return `6_${check}`
    return true;
}

async function mfa(request, response) {
    if (request.method === "POST") {
        var replace_data = await utils.get_frontend_content(request);
        if (!replace_data || replace_data === undefined)
            return `1_${replace_data}`;
        const userid = await utils.get_decrypted_userid(request, response);
        if (!userid || userid === undefined || userid < 0)
            return `2_${userid}`;
        if (replace_data.Function == 'create_otc') {
            const otc_return = await utils.create_otc(userid, response);
            if (!otc_return || otc_return === undefined || otc_return < 0)
                return `3_${otc_return}`;
            return true;
        } else if (replace_data.Function == 'verify') {
            response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
            var verified = await utils.verify_otc(request, response, replace_data, null);
            if (verified && verified !== undefined && !(verified < 0)) {
                const check_mfa = await mfa_db.get_mfa_value('self', userid);
                var new_otc_str = check_mfa.otc;
                if (new_otc_str.endsWith('_temp'))
                    new_otc_str = new_otc_str.slice(0, -5);
                await mfa_db.update_mfa_value('otc', new_otc_str, userid);
                if (check_mfa.prefered === 0)
                    await mfa_db.update_mfa_value('prefered', 2, userid);
                response.end(JSON.stringify({"Response": "Success"}));
            }
            else
                response.end(JSON.stringify({"Response": "Failed"}));
            return true;
        } else if (replace_data.Function == 'create_custom') {
            console.log("LOL");
            return await utils.create_custom_code(userid, response, replace_data);
        } else if (replace_data.Function == 'verify_function') {
            return await utils.verify_custom_code(userid, response, replace_data);
        } else if (replace_data.Function == 'create_email') {
            const returned = await utils.create_email_code(userid, response, replace_data);
            console.log(returned);
            return returned;
        } else if (replace_data.Function == 'verify_email') {
            return await utils.verify_email_code(userid, response, replace_data);;
        } else if (replace_data.Function == 'remove_custom_code') {
            const clear_return = await utils.clear_settings_mfa(userid, 'custom', response);
            if (!clear_return || clear_return === undefined || clear_return < 0)
                return `4_${clear_return}`;
            return true;
        } else if (replace_data.Function === 'remove_otc') {
            const clear_return = await utils.clear_settings_mfa(userid, 'otc', response);
            if (!clear_return || clear_return === undefined || clear_return < 0)
                return `5_${clear_return}`;
            return true;
        } else if (replace_data.Function === 'remove_email') {
            const clear_return = await utils.clear_settings_mfa(userid, 'email', response);
            if (!clear_return || clear_return === undefined || clear_return < 0)
                return `6_${clear_return}`;
            return true;
        }
    }
    const status = await send.send_html('settings.html', response, 200, async (data) => {
        const userid = await utils.get_decrypted_userid(request, response);
        if (userid === -1)
            return send.redirect(response, '/login', 302);
        else if (userid === -2)
            return true;
        const check_mfa = await mfa_db.get_mfa_value('self', userid);
        if (check_mfa === undefined || check_mfa === null)
            return data.replace("{{mfa-button}}", '<div class="buttons mb-6" onclick="create_otc()"><button class="block w-full mb-6 mt-6" "><span class="button_text">Create OTC</span></button></div>\
                <div class="buttons mb-6" onclick="create_custom_code()"><button class="block w-full mb-6 mt-6""><span class="button_text">Create custom 6 diggit code</span></button></div>\
                <div class="buttons mb-6" onclick="create_email()"><button class="block w-full mb-6 mt-6""><span class="button_text">Enable email authentication</span></button></div>\
                <a class="buttons mb-6" href="/settings/user_settings"><button class="block w-full mb-6 mt-6"><span class="button_text">Change User Information</span></button></a>\
                <a class="buttons mb-6" onclick="change_game()"><button class="block w-full mb-6 mt-6"><span class="button_text">Change Game settings</span></button></a>\
                <div class="flex mt-12 gap-4 w-full">\
                <a class="flex-1">\
                    <button onclick="window.location.href=\'http://localhost:8080/settings\'" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">\
                        <span class="font-bold text-lg">Back</span>\
                    </button>\
                </a>\
                <a class="flex-1">\
                    <button onclick="logout()" class="flex items-center gap-4 bg-gradient-to-br to-[#d1651d] to-85% from-[#d1891d] border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">\
                        <span class="font-bold text-lg">Logout</span>\
                    </button>\
                    </a>\
                </div>'
            );
        // <button onclick="window.location.reload()" class="flex items-center gap-4 bg-gradient-to-br to-[#d16e1d] from-[#e0d35f] from-5% border-black border border-spacing-5 rounded-xl px-6 py-4 w-full">\
        var replace_string = "";
        var select_number = 0;
        var select_menu = "";
        if (check_mfa.otc.length !== 0 && !check_mfa.otc.endsWith('_temp')) {
            replace_string += '<button onclick="create_otc()">Regenerate OTC</button> ';
            replace_string += '<button onclick="remove_otc()">Remove OTC</button> ';
            select_number++;
            select_menu += '<option value="otc">Otc</option>';
        } else
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_otc()"><span class="button_text">Create OTC</span></button></div> ';
        // replace_string += '<br></br>'
        if (check_mfa.custom.length !== 0 && !check_mfa.custom.endsWith('_temp')) {
            replace_string += '<button onclick="create_custom_code()">Recreate custom 6 diggit code</button> ';
            replace_string += '<button onclick="remove_custom_code()">Remove custom 6 digit code</button> ';
            select_number++;
            select_menu += '<option value="custom">Custom</option>';
        } else
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_custom_code()"><span class="button_text">Create custom 6 diggit code</span></button></div> ';
        // replace_string += '<br></br>'
        if (check_mfa.email.length !== 0 && !check_mfa.email.endsWith('_temp')) {
            console.log("WOW");
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="remove_email()"><span class="button_text">Disable email authentication</span></button></div> ';
            select_number++;
            select_menu += '<option value="email">Email</option>';
        } else
            replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="create_email()"><span class="button_text">Enable email authentication</span></button></div> ';
        // replace_string += '<br></br>'
        replace_string += '<div class="buttons mb-6"><button class="block w-full mb-6 mt-6" onclick="change_info()"><span class="button_text">Change User Information</span></button></div> ';
        if (select_number < 2)
            return data.replace("{{mfa-button}}", `${replace_string} <button onclick="window.location.href = \'http://localhost:8080\'">Back</button> \
                <button onclick="logout()">Logout</button>`);
        select_menu = `
        <form id="mfa_select_form">
            <select name="mfa" id="mfa">
                <option value="" selected disabled hidden>Choose a default authentication method</option>
                    ${select_menu}
            </select>
            <button type="submit">Submit</button>
        </form>
        <br>`;
        return data.replace("{{mfa-button}}", `${replace_string} ${select_menu} <button onclick="window.location.href = \'http://localhost:8080/settings\'">Back</button> \
        <button onclick="logout()">Logout</button>`);
    });
    if (!status || status === undefined || status < 0 || status == false)
        return `7_${status}`;
    return true;
}

async function user(request, response) {
    if (request.method == 'POST') {
        console.log("Here");

    }
    const status = await send.send_html('settings.html', response, 200, async (data) => {
        var replace_string = '<button onclick="change_language()">Change language</button><br></br>';
        replace_string += `
        <form id="language">
            <select name="lang" id="lang">
                <option value="" selected disabled hidden>Choose your main language</option>
                <option value="af">Afrikaans</option>
                <option value="az">Azərbaycanca</option>
                <option value="id">Bahasa Indonesia</option>
                <option value="ms">Bahasa Melayu</option>
                <option value="jw">Basa Jawa</option>
                <option value="su">Basa Sunda</option>
                <option value="bs">Bosanski</option>
                <option value="ca">Català</option>
                <option value="ceb">Cebuano</option>
                <option value="sn">ChiShona</option>
                <option value="ny">Chichewa</option>
                <option value="co">Corsu</option>
                <option value="cy">Cymraeg</option>
                <option value="da">Dansk</option>
                <option value="de">Deutsch</option>
                <option value="et">Eesti</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="eo">Esperanto</option>
                <option value="eu">Euskara</option>
                <option value="fr">Français</option>
                <option value="fy">Frysk</option>
                <option value="ga">Gaeilge</option>
                <option value="sm">Gagana Samoa</option>
                <option value="gl">Galego</option>
                <option value="gd">Gàidhlig</option>
                <option value="ha">Hausa</option>
                <option value="hmn">Hmoob</option>
                <option value="hr">Hrvatski</option>
                <option value="ig">Igbo</option>
                <option value="it">Italiano</option>
                <option value="sw">Kiswahili</option>
                <option value="ht">Kreyòl Ayisyen</option>
                <option value="ku">Kurdî</option>
                <option value="la">Latina</option>
                <option value="lv">Latviešu</option>
                <option value="lt">Lietuvių</option>
                <option value="lb">Lëtzebuergesch</option>
                <option value="hu">Magyar</option>
                <option value="mg">Malagasy</option>
                <option value="mt">Malti</option>
                <option value="mi">Māori</option>
                <option value="nl">Nederlands</option>
                <option value="no">Norsk</option>
                <option value="uz">Oʻzbekcha</option>
                <option value="pl">Polski</option>
                <option value="pt">Português</option>
                <option value="ro">Română</option>
                <option value="st">Sesotho</option>
                <option value="sq">Shqip</option>
                <option value="sk">Slovenčina</option>
                <option value="sl">Slovenščina</option>
                <option value="so">Soomaali</option>
                <option value="fi">Suomi</option>
                <option value="sv">Svenska</option>
                <option value="tl">Tagalog</option>
                <option value="vi">Tiếng Việt</option>
                <option value="tr">Türkçe</option>
                <option value="yo">Yorùbá</option>
                <option value="xh">isiXhosa</option>
                <option value="zu">isiZulu</option>
                <option value="is">Íslenska</option>
                <option value="cs">Čeština</option>
                <option value="haw">ʻŌlelo Hawaiʻi</option>
                <option value="el">Ελληνικά</option>
                <option value="be">Беларуская</option>
                <option value="bg">Български</option>
                <option value="ky">Кыргызча</option>
                <option value="mk">Македонски</option>
                <option value="mn">Монгол</option>
                <option value="ru">Русский</option>
                <option value="sr">Српски</option>
                <option value="tg">Тоҷикӣ</option>
                <option value="uk">Українська</option>
                <option value="kk">Қазақша</option>
                <option value="hy">Հայերեն</option>
                <option value="yi">ייִדיש</option>
                <option value="iw">עברית</option>
                <option value="ur">اردو</option>
                <option value="ar">العربية</option>
                <option value="sd">سنڌي</option>
                <option value="fa">فارسی</option>
                <option value="ps">پښتو</option>
                <option value="ne">नेपाली</option>
                <option value="mr">मराठी</option>
                <option value="hi">हिन्दी</option>
                <option value="bn">বাংলা</option>
                <option value="gu">ગુજરાતી</option>
                <option value="ta">தமிழ்</option>
                <option value="te">తెలుగు</option>
                <option value="kn">ಕನ್ನಡ</option>
                <option value="ml">മലയാളം</option>
                <option value="si">සිංහල</option>
                <option value="th">ไทย</option>
                <option value="lo">ລາວ</option>
                <option value="my">မြန်မာ</option>
                <option value="ka">ქართული</option>
                <option value="km">ភាសាខ្មែរ</option>
                <option value="ja">日本語</option>
                <option value="zh-cn">简体中文</option>
                <option value="zh-tw">繁體中文</option>
                <option value="ko">한국어</option>
            </select>
            <button type="submit">Submit</button>
        </form>`
        replace_string += '<button onclick="window.location.href = \'http://localhost:8080/settings\'">back</button> \
        <button onclick="logout()">Logout</button>';
        return data.replace('{{mfa-button}}', replace_string);
    });
    return true;
}

async function settings(request, response) {
    var [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token'))
        return send.redirect(response, '/login', 302);
    const request_url = request.url.slice(9);
    if (request_url.startsWith("/mfa?"))
        return await settings_set_prefered_mfa(request, response);
    if (request_url == "/mfa")
        return await mfa(request, response);
    if (request_url.startsWith("/user?"))
        return await settings_prefered_language(request, response);
    if (request_url == "/user")
        return await user(request, response);
    // if (request.method === 'POST') {

    // }
    const status = await send.send_html('settings.html', response, 200, async  (data) => {
        var replace_string = '<button onclick="window.location.href = \'http://localhost:8080/settings/mfa\'">mfa</button><br></br>';
        replace_string += '<button onclick="window.location.href = \'http://localhost:8080/settings/user\'">user</button><br></br>';
        replace_string += '<button onclick="window.location.href = \'http://localhost:8080\'">back</button> \
        <button onclick="logout()">Logout</button>';
        return data.replace('{{mfa-button}}', replace_string);
    });
    if (!status || status === undefined || status < 0)
        return `_${status}`
    return true;
}

async function settings_set_prefered_mfa(request, response) {
    if (request.url.length < 11)
        return send.redirect(response, '/settings/mfa', 302);
    const location = request.url.slice(10);
    if (!location.indexOf('='))
        return send.redirect(response, '/settings/mfa', 302);
    const pos = location.indexOf('=') + 1;
    if (location.length === pos)
        return send.redirect(response, '/settings/mfa', 302);
    const method = location.slice(pos);
    const {keys, values} = utils.get_cookie('token', request);
    if ((!keys && !values) || (keys === undefined && values === undefined))
        return send.redirect(response, '/settings/mfa', 302);
    const decrypted_user =  modules.get_jwt(values[0]);
    const userid = decrypted_user.userid;
    const check_mfa = await mfa_db.get_mfa_value('self', userid);
    if (!check_mfa || check_mfa === undefined)
        return send.redirect(response, '/settings/mfa', 302);
    if (method === 'email') {
        await mfa_db.update_mfa_value('prefered', 1, userid);
    } else if (method === 'otc') {
        await mfa_db.update_mfa_value('prefered', 2, userid);
    } else if (method === 'custom') {
        await mfa_db.update_mfa_value('prefered', 3, userid);
    }
    return send.redirect(response, '/settings/mfa', 302);    
}

async function settings_prefered_language(request, response) {
    if (request.url.length < 11)
        return send.redirect(response, '/settings/user', 302);
    const location = request.url.slice(10);
    if (!location.indexOf('='))
        return send.redirect(response, '/settings/user', 302);
    const pos = location.indexOf('=') + 1;
    if (location.length === pos)
        return send.redirect(response, '/settings/user', 302);
    const method = location.slice(pos);
    var [keys, values] = modules.get_cookies(request.headers.cookie);
    const user_check = keys?.find((key) => key === 'token');
    if (!user_check || user_check === undefined || user_check == false)
        return false;
    const userIndex = keys.indexOf('token');
    var user = values[userIndex];
    user = modules.get_jwt(user);
    const lang_check = keys?.find((key) => key === 'lang');
    if (!lang_check || lang_check === undefined || lang_check == false)
        return false;
    const langIndex = keys.indexOf('lang');
    var lang = values[langIndex];
    lang = await modules.get_jwt(lang);
    if (lang.userid == method)
        return send.redirect(response, '/settings/user', 302);
    const lang_jwt = modules.create_jwt(method, '1h');
    if (!lang_jwt || lang_jwt == undefined || lang_jwt < 0)
        return send.redirect(response, '/settings/user', 302);
    modules.delete_cookie(response, 'lang');
    modules.set_cookie(response, 'lang', lang_jwt);
    console.log(user);
    const wow = await settings_db.update_settings_value('lang', method, user.userid);
    console.log(wow);
    return send.redirect(response, '/settings/user', 302);
}

async function verify_email(request, response) {
    if (request.method !== 'POST')
        return await send.send_error_page('404.html', response, 404);
    const frontend_data = await utils.get_frontend_content(request);
    if (!frontend_data || frontend_data === undefined || frontend_data < 0)
        return false;
    const check_mfa = await mfa_db.get_mfa_value('self', frontend_data.userid);
    if (!check_mfa || check_mfa === undefined || check_mfa.email.length === 0 || check_mfa.email.endsWith('_temp'))
        return false;
    const valid_password = await modules.check_encrypted_password(frontend_data.code, check_mfa.email);
    if (!valid_password || valid_password === undefined || valid_password < 0) {
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = modules.create_jwt(frontend_data.userid, '1h');
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'reload', "Content": null}));
    }
    return true;
}

async function verify_2fa(request, response) {
    if (request.method !== 'POST')
        return await send.send_error_page('404.html', response, 404);
    const frontend_data = await utils.get_frontend_content(request);
    if (!frontend_data || frontend_data === undefined || frontend_data < 0)
        return false;
    const replace_data = {'Function': 'verify', 'Code': frontend_data.code};
    const temp = await utils.verify_otc(request, response, replace_data, frontend_data.userid);
    if (temp === false || !temp || temp === undefined || temp < 0) {
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = modules.create_jwt(frontend_data.userid, '1h');
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'reload', "Content": null}));
    }
    return true;
}

async function verify_custom(request, response) {
    if (request.method !== 'POST')
        return await send.send_error_page('404.html', response, 404);
    const frontend_data = await utils.get_frontend_content(request);
    if (!frontend_data)
        return false;
    const replace_data = {'Function': 'verify', 'Code': frontend_data.code};
    const temp = await utils.verify_custom_code(frontend_data.userid, response, replace_data);
    if (temp === false) {
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'failed', "Content": null}));
    } else {
        const token = modules.create_jwt(frontend_data.userid, '1h');
        
        modules.set_cookie(response, 'token', token, true, true, 'strict');
        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.end(JSON.stringify({"Response": 'reload', "Content": null}));
    }
    return true;
}


//was generated by chatgpt rewrite later for better use and understanding
async function profile(request, response){

    // if (request.method === 'POST'){
    //     const replace_data = await utils.get_frontend_content(request);
    //     if (!replace_data || replace_data === undefined){
    //         return `Error: Invalid data`;
    //     }

    //     const updated = await users_db.update_users_value(decoded.userid, replace_data.username, replace_data.email);
    //     if (!updated || updated === undefined) {
    //         return `Error updating profile`;
    //     }

    //     response.writeHead(200, { 'Contend-Type': 'application/json' });
    //     response.end(JSON.stringify({ Response: 'Profile updated sucessfully' }));
    //     return true;
    // }

    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')){ 
        return send.redirect(response, '/login', 302);
    }

    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err){
        return send.redirect(response, '/login', 302);
    }

    const user = await users_db.get_users_value('self', decoded.userid);
    if (!user || user === undefined){
        return send.send_error_page('404.html', response, 404);
    }

    const settings = await settings_db.get_settings_value('self', decoded.userid);
    if (!settings || settings === undefined){
        return send.send_error_page('404.html', response, 404);
    }

    const status = await send.send_html('profile.html', response, 200, async(data) => {
        data = data.replace('{{username}}', user.username);
        data = data.replace('{{email}}', settings.email || 'Not provided');
        data = data.replace('{{picture}}', settings.pfp || 'public/default_profile.svg');
        data = data.replace('{{status}}', ()=> {if (user.status === 1) return 'online'; else return 'offline'});
        return data;
    });

    if (!status || status === undefined || status < 0){
        return `Error rendering profile page: ${status}`;
    }
    return true;
}


//was generated by chatgpt rewrite later for better use and understanding
async function logout(request, response) {
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return send.redirect(response, '/login', 302);
    }

    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token); // Decode the JWT to get the user ID
    } catch (err) {
        return send.redirect(response, '/login', 302);
    }

    const user = await users_db.get_users_value('self', decoded.userid);
    if (!user || user === undefined){
        return send.send_error_page('404.html', response, 404);
    }

    await users_db.update_users_value('status', 0, decoded.userid);

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: 'Logged out successfully' }));
}


async function user_settings(request, response) {
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return send.redirect(response, '/login', 302);
    }

    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    } catch (err) {
        return send.redirect(response, '/login', 302);
    }

    const status = await send.send_html('user_settings.html', response, 200);
    if (!status || status === undefined){
        return `Error rendering user settings page: ${status}`;
    }
    return true;
}





// fix later dont know where to put it exactly
async function update_settings(request, response) {
    if (request.method !== 'POST'){
        return send.send_error_page('404.html', response, 404);
    }

    const data = await utils.get_frontend_content(request);
    if (!data || data === undefined){
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ message: 'Invalid data' }));
        return ;
    }
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return send.redirect(response, '/login', 302);
    }

    const { email, password } = data;


    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    }
    catch (err) {
        return send.redirect(response, '/login', 302);
    }
    const userid = decoded.userid;


    try {
        let result = await settings_db.update_settings_value('email', email, userid);
        result = await settings_db.update_settings_value('password', password, userid);
        if (result) {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({message: 'Successfully updated Username'}));
        }
        else{
            response.writeHead(500, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({message: 'Failed to update Username'}));
        }
    }
    catch (err){
        console.log("Error regarding updating user: " + err);
        response.writeHead(500, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({message: 'Server error'}));
    }


    // const settings_db = decoded.settings;
    // console.log("DB: SETTINGS_EMAIL: " + settings_db.email);
    // console.log("DB: SETTINGS_PW: " + settings_db.password);
    return;
}

async function update_user(request, response) {
    if (request.method !== 'POST') {
        return send.send_error_page('404.html', response, 404);
    }

    const data = await utils.get_frontend_content(request);
    if (data === null || data === undefined){
        response.writeHead(400, { 'Content-Type ': 'application/json' });
        response.end(JSON.stringify({ message: 'Invalid data' }));
        return ;
    }
    const [keys, values] = modules.get_cookies(request.headers.cookie);
    if (!keys?.includes('token')) {
        return send.redirect(response, '/login', 302);
    }

    const tokenIndex = keys.findIndex((key) => key === 'token');
    const token = values[tokenIndex];
    let decoded;
    try {
        decoded = await modules.get_jwt(token);
    }
    catch (err) {
        return send.redirect(response, '/login', 302);
    }

    const userid = decoded.userid;

    try {
        const result = await users_db.update_users_value('username', data.usernameValue, userid);
        if (result) {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({message: 'Successfully updated Username'}));
        }
        else{
            response.writeHead(500, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({message: 'Failed to update Username'}));
        }
    }
    catch (err){
        console.log("Error regarding updating user: " + err);
        response.writeHead(500, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({message: 'Server error'}));
    }
}



export {
    login,
    register,
    settings,
    mfa,
    home,
    verify_email,
    verify_2fa,
    verify_custom,
    settings_set_prefered_mfa,
    profile,
    logout,
    user_settings,
    update_user,
    update_settings
}