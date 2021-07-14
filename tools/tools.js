function checkIfIpIsBan(con, ipUser, res) {
    let sync = true;
    let valeur_retour = false;
    con.getConnection()
        .then(conn => {
            let query = "SELECT * FROM brute_force WHERE ip_user = ?";
            let value = ipUser;
            conn.query(query, value).then((result) => {
                if(result.length > 0) {
                    valeur_retour = true;
                }else{
                    valeur_retour = false;
                }
                sync = false;
            });
    });

    while(sync) {require('deasync').sleep(100);}
    return valeur_retour;
}

function saveBruteForceData(con, bruteDelta, userIp, userIdentifiant, transport) {
    con.getConnection()
        .then(conn => {
            let query = "SELECT * FROM user WHERE identifiant = '" + userIdentifiant +"'";
            conn.query(query).then((result) => {
                if(result.length > 0) {
                    email2 = result[0].email;
                    sendMailByType(email2, 3, transport);
                }
            });
        });
    con.getConnection()
        .then(conn => {
            let arrayTimeStampSum = bruteDelta.reduce((a,b) => a + b, 0)
            let dateBan = new Date().toISOString().slice(0,19).replace('T', ' ');
            if(( arrayTimeStampSum / (bruteDelta.length - 1)) <= 500) {
                let query2 = "INSERT INTO brute_force(ip_user, date_ban) VALUES ( '" + userIp + "','" + dateBan + "')";
                conn.query(query2);
                conn.release();
            }
    });
};

function sendMailByType(email, emailType, transport) {
    // type 1 = changement de navigateur, 2 = changement ip, 3 = ipBan
    let subject = "";
    let text = "";
    switch (emailType) {
        case 1 :
            subject = 'Changement de navigateur detecté';
            text = 'Nous avons detecté un changement de navigateur. ' +
                'Si ce changement est de votre fait veuillez cliquer sur le lien ci dessous afin de confirmer la connexion';
            break;
        case 2 :
            subject = 'Notification';
            text = 'Nous vous informons avoir détecté un changement d\'adresse ip sur votre compte.'
            break;
        case 3 :
            subject = 'Ban';
            text = 'Nous vous informons que votre ip est bannis. Veuillez contacter nos services pour plus d\'informations';
            break;
    }

    const message = {
        from: 'georges.garnier1@gmail.com',
        to: email,
        subject: subject,
        text: text
    };

    //envoyer
    transport.sendMail(message, function(err, result) {
        if(err) {
            console.log(err)
        } else {
            console.log(result)
        }
    });
}


/**
 * Méthode pour vérifier si le mot de passe à déjà été détecter comme pirater.
 * @param {*} password Le mot de passe à contrôler
 * @param {*} crypto La crypto pour le hash du password.
 * @param {*} https protocole pour consommer l'API
 * @returns boolean true si le mpd est corrompu. False dans le cas intverse.
 */
function check_password_api(password,crypto,https){
    let sync = true;
    let hashedPassword = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    let prefix = hashedPassword.slice(0,5);
    let apiCall = `https://api.pwnedpasswords.com/range/${prefix}`;
    let hashes = '';
    let corrompu = 0;

    https.get(apiCall,function(res){
        res.setEncoding('utf8');
        res.on('data',(chunk) => hashes += chunk);
        res.on('end', function(){
            corrompu = onEnd();
            sync = false;
        });
    }).on('error', function (err){
        console.log(`Erreur durant l'appel API : ${apiCall} => ${err}`);
    });
    function onEnd(){
        let res = hashes.split('\r\n').map((h) => {
            let sp = h.split(':');
            return{
                hash: prefix + sp[0],
                count: parseInt(sp[1])
            };
        });
        let found = res.find((h) => h.hash == hashedPassword);
        if ( found ){
            return true;
        }else{
            return false;
        };
    };
    while(sync) {require('deasync').sleep(100);}
    return corrompu;
};

module.exports = { checkIfIpIsBan, saveBruteForceData, sendMailByType,check_password_api}