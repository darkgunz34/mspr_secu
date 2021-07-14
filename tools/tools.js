function checkIfIpIsBan(con, ipUser) {
    let sync = true;
    let valeur_retour = false;
    con.getConnection()
        .then(conn => {
            let query = "SELECT * FROM brute_force WHERE ip_user = '" + ipUser + "'";
            conn.query(query).then((result) => {
                if(result.length > 0) {
                    valeur_retour = true;
                }
                sync = false;
            });
    });

    while(sync) {require('deasync').sleep(100);}
    return valeur_retour;
}

function checkUserAgent(mail, con, agent) {
    let sync = true;
    let valeur_retour = false;

    con.getConnection()
        .then(conn => {
            let query = "SELECT count(*) FROM access WHERE a_mail = '" + mail + "' and a_active = 'true' and a_agent = '"+ agent +"' ORDER BY a_date DESC LIMIT 1";
            conn.query(query)
                .then((result) => {
                    if(result.count() >= 1) {
                        valeur_retour = true;
                    }
                    sync = false;
                });
        });
    while(sync) {require('deasync').sleep(100);}
    return valeur_retour;
}

function declarationChangementSupport(email,adresse_ip,typeSupport,date) {
    con.getConnection()
        .then(conn => {
            let query = "INSERT INTO access (a_prenom,a_ip,a_agent,a_date,a_active) VALUES ("+email+"', '"+adresse_ip+"','"+typeSupport+"', '"+date+"','false')";
            conn.query(query);
        });
}

function checkValide(con,mail,code){
    return con.getConnection()
        .then(conn => {
            let query = "SELECT * FROM access_validation WHERE mail = '"+ mail + "' and code = '" + code + "'"; 
            return conn.query(query).then((result) => {
                if(result.length > 0) {
                    return true;
                }
            });
        });
}

function saveBruteForceData(con, bruteDelta, userIp, userIdentifiant, transport) {
    con.getConnection()
        .then(conn => {
            let query = "SELECT * FROM user WHERE identifiant = '" + userIdentifiant +"'";
            conn.query(query).then((result) => {
                if(result.length > 0) {
                    email2 = result[0].email;
                    sendMailByType(email2, 3, transport,null);
                }
            });
        });
    con.getConnection()
        .then(conn => {
            let arrayTimeStampSum = bruteDelta.reduce((a,b) => a + b, 0);
            let dateBan = convertDate(new Date());
            if(( arrayTimeStampSum / (bruteDelta.length - 1)) <= 500) {
                let query2 = "INSERT INTO brute_force(ip_user, date_ban) VALUES ( '" + userIp + "','" + dateBan + "')";
                conn.query(query2);
            }
    });
};

function getAgentFromAccessValidation(con,mail,code){
    let valeur_retour;
    con.getConnection()
        .then(conn => {
            let query = "SELECT agent FROM access_validation WHERE mail = '" + mail +"' and code = '" + code +"'";
            conn.query(query).then((result) => {
                if(result.length > 0) {
                    valeur_retour = agent;
                }
            });
        });
    return valeur_retour;
}

function enAttente(code,mail,date,agent,con){
    con.getConnection()
    .then(conn => {
        let query = "INSERT INTO `access_validation`(`mail`, `date`, `code`,`agent`) VALUES ("+mail+","+date+","+code+","+ agent +")";
        conn.query(query);
    });
}

function updateAccess(con,mail,agent){
    con.getConnection()
    .then(conn => {
        let query = "UPDATE access SET a_active = 'true' WHERE a_mail = '"+ mail +"' and a_agent = "+agent+"'";
        conn.query(query);  
    });
}

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
    transport.sendMail(message);
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
        let found = res.find((h) => h.hash === hashedPassword);
        if ( found ){
            return true;
        }else{
            return false;
        };
    };
    while(sync) {require('deasync').sleep(100);}
    return corrompu;
};

function recuperationAgentFromRequest(req){
    return userAgent.parse(req.headers['user-agent']);
}

function convertDate(date){
    return date.toISOString().slice(0,19).replace('T', ' ');
}
module.exports = { checkIfIpIsBan, saveBruteForceData, sendMailByType,check_password_api,checkUserAgent,declarationChangementSupport,enAttente,checkValide,updateAccess,recuperationAgentFromRequest,getAgentFromAccessValidation}