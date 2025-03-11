const nodemailer = require('nodemailer');

// Erstelle einen Transporter mit Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '42fttranscendence.project@gmail.com', // Deine Gmail-Adresse
        pass: 'dfoi ltpe ihay kfiy'     // Das App-Passwort, das du generiert hast
    }
});

// E-Mail-Optionen
const mailOptions = {
    from: '42fttranscendence.project@gmail.com',    // Absenderadresse
    to: 'yannis@gmx.at', // Empfängeradresse
    subject: 'Test-E-Mail von Node.js', // Betreff
    text: 'Hallo, dies ist eine Test-E-Mail, die von Node.js gesendet wurde!' // E-Mail-Text
};

// E-Mail versenden
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.log('Fehler beim Senden der E-Mail:', error);
    } else {
        console.log('E-Mail erfolgreich gesendet:', info.response);
    }
});