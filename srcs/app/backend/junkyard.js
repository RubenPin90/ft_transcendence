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
    if (parsed.mfa && parsed.mfa.email && !parsed.mfa.email.endsWith('_temp') && parsed.mfa.prefered === 1) {
        var email_code = Math.floor(Math.random() * 1000000);
        const email_code_len = 6 - (String(email_code).length);
        for (var pos = 0; pos < email_code_len; pos++)
            email_code = '0' + email_code;
        await modules.send_email(parsed.settings.email, 'MFA code', `This is your 2FA code. Please do not share: ${email_code}`);
        email_code = await modules.create_encrypted_password(String(email_code));
        await mfa_db.update_mfa_value('email', email_code, parsed.mfa.self);
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'send_email_verification', "Content": parsed.settings.self}));
        return true;
    } else if (parsed.mfa && parsed.mfa.otc && !parsed.mfa.otc.endsWith('_temp') && parsed.mfa.prefered === 2) {
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'send_2FA_verification', "Content": parsed.settings.self}));
        return true;
    } else if (parsed.mfa && parsed.mfa.custom && !parsed.mfa.custom.endsWith('_temp') && parsed.mfa.prefered === 3) {
        response.raw.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
        response.raw.end(JSON.stringify({"Response": 'send_custom_verification', "Content": parsed.settings.self}));
        return true;
    }
}