

function checkIfIpIsBan(con, ipUser, res) {
    let sync = true;
    con.getConnection()
        .then(conn => {
            let query = "SELECT * FROM brute_force WHERE ip_user = ?";
            let value = ipUser;
            conn.query(query, value).then((result) => {
                if(result.length > 0) {
                    console.log("GO BAN");
                    conn.release();
                    res.render('ban');
                    sync = false;
                }else{
                    console.log("GO NON BAN");
                    conn.release();
                    sync = false;
                }
        });
    });

    while(sync) {require('deasync').sleep(100);}
}

function checkIfPasswordIsGood(con, user_name, password, bcrypt, res, transport, corrompu, callback) {
    con.getConnection().then(conn => {
        let querry = "SELECT * FROM user WHERE identifiant = '" + user_name + "'";
        console.log(querry);
        conn.query(querry).then((result) => {
            if(result.length > 0) {
                if(corrompu === 1) {
                    sendMailByType(result[0].email, 4, transport); // envoie email si password corrompu
                }
                bcrypt.compare(password, result[0].password, function(err2, result2) {
                    conn.release();
                    if(result2) {
                        return callback(true);
                    }
                    return callback(false);

                });
            }
            else{
                conn.release();
                return callback(false);
            }
        });
    });
}

function saveBruteForceData(con, bruteDelta, userIp, userIdentifiant, transport) {
    console.log("Call saveBruteForceData");
    con.getConnection()
        .then(conn => {
            let query = "SELECT * FROM user WHERE identifiant = '" + userIdentifiant +"'";
            conn.query(query).then((result) => {
                if(result.length > 0) {
                    console.log("valide la fonction battard !");
                    let email2 = result[0].email;
                    conn.release();
                    sendMailByType(email2, 3, transport);
                }else{
                    conn.release();
                }
            });
        });
    con.getConnection()
        .then(conn => {
            let arrayTimeStampSum = bruteDelta.reduce((a,b) => a + b, 0)
            let dateBan = new Date().toISOString().slice(0,19).replace('T', ' ');
            console.log(( arrayTimeStampSum / (bruteDelta.length - 1)) <= 500);
            if(( arrayTimeStampSum / (bruteDelta.length - 1)) <= 500) {
                let query2 = "INSERT INTO brute_force(ip_user, date_ban) VALUES ( '" + userIp + "','" + dateBan + "')";
                conn.query(query2);
                console.log("insertion ? : " + query2);
                conn.release();
            }
    });
};

function checkUserAgent(nom, req, con, transport, userAgent, callback) {
    let agent = userAgent.parse(req.headers['user-agent']);
    con.getConnection()
        .then(conn => {
            let query = "SELECT * FROM user WHERE identifiant = '" + nom + "'";
            conn.query(query)
                .then((result) => {
                    if(agent.family !== result[0].user_agent) {
                        sendMailByType(result[0].email, 1, transport);
                       return callback(false)
                    } else {
                        console.log("meme navigateur");
                        return callback(true);
                    }
                })
        });
}

function sendMailByType(email, emailType, transport) {
    // type 1 = changement de navigateur, 2 = changement ip, 3 = ipBan
    let subject = "";
    let text = "";
    switch (emailType) {
        case 1 :
            subject = 'Changement de navigateur detecté';
            text = 'Nous avons detecté un changement de navigateur. ' +
                'Si ce changement est de votre fait veuillez cliquer sur le lien ci dessous afin de confirmer la connexion <a href="http://localhost:4242/valid">valide ?</a>';
            break;
        case 2 :
            subject = 'Notification';
            text = 'Nous vous informons avoir détecté un changement d\'adresse ip sur votre compte.'
            break;
        case 3 :
            subject = 'Ban';
            text = 'Nous vous informons que votre ip est bannis. Veuillez contacter nos services pour plus d\'informations';
            break;
        case 4 :
            subject = 'email corrompu';
            text = "Nous vous informons que votre mot de passe est corrompu suite à une fuite de données"
    }

    const message = {
        from: 'georges.garnier1@gmail.com',
        to: email,
        subject: subject,
        html: text
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



module.exports = { checkIfIpIsBan, checkIfPasswordIsGood, saveBruteForceData, checkUserAgent}

/*
const salt = 10;
bcrypt.genSalt(salt, function(err, salt) {
    bcrypt.hash('test', salt, function(err, hash) {
        console.log(hash);
    });
});*/

/*var secret = speakeasy.generateSecret();
var secretTemp = secret.base32;
var QRCode = require('qrcode');
QRCode.toDataURL(secret.otpauth_url, function(err, data_url) {
    console.log(data_url);
    con.connect(function(err) {
    // envoie qr_code to db
        var query = "INSERT INTO qr_code(code) VALUES( ? )";
        con.query(query,data_url, function(err, result) {
            //
        });
    });
})*/
