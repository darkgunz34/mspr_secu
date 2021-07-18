

function sendMailByType(email, emailType, transport,code) {
    // type 1 = changement de navigateur, 2 = changement ip, 3 = ipBan
    let subject = "";
    let text = "";
    switch (emailType) {
        case 1 :
            subject = 'Changement de navigateur detecté';
            text = 'Nous avons detecté un changement de navigateur. ' +
                'Si ce changement est de votre fait vous rendre sur la page d\'authorisation prévu à cette effet avec le code suivant : ' + code;
            break;
        case 2 :
            subject = 'Notification';
            text = 'Nous vous informons avoir détecté un changement d\'adresse ip sur votre compte.'
            break;
        case 3 :
            subject = 'Ban';
            text = 'Nous vous informons que votre ip est bannis. Veuillez contacter nos services pour plus d\'informations.';
            break;
    }

    const message = {
        from: 'noreply@portail.com',
        to: email,
        subject: subject,
        text: text
    };

    //envoyer
    transport.sendMail(message);
}

function recuperationAgentFromRequest(req,userAgent){
    return userAgent.parse(req.headers['user-agent']);
}

function convertDate(date){
    return date.toISOString().slice(0,19).replace('T', ' ');
}
module.exports = {sendMailByType,recuperationAgentFromRequest,convertDate}