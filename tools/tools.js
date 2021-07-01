function checkIfIpIsBan(con, ipUser, res) {
    con.connect(function(err) {
        let query = "SELECT * FROM brute_force WHERE ip_user = ?";
        let value = ipUser;
        con.query(query,value, function(err, result) {
            console.log(result);
            if(err) throw err;
            if(result.length > 0) {
              res.render('ban')
            }
        });
    });
}

function checkIfPasswordIsGood(con, user_name, password, bcrypt, res) {
    con.connect(function(err) {
        var query = "SELECT * FROM user WHERE identifiant = ?";
        con.query(query,user_name, function(err, result) {
            if(err) console.log(err);
            if(result.length > 0) {
                bcrypt.compare(password, result[0].password, function(err2, result2) {
                   res.render('check');
                })
            }
        });
    });
}

function saveBruteForceData(con, bruteDelta, userIp, userIdentifiant, transport) {
    // get user mail
    let email2 = "";
    let query = "SELECT * FROM user WHERE identifiant = ?";
    con.query(query, userIdentifiant, function(err, result) {
        if(err) console.log(err);
        if(result.length > 0) {
            email2 = result[0].email;
            sendMailByType(email2, 3, transport);
        }
    });
    let arrayTimeStampSum = bruteDelta.reduce((a,b) => a + b, 0)
    let dateBan = new Date().toISOString().slice(0,19).replace('T', ' ');
    if(( arrayTimeStampSum / (bruteDelta.length - 1)) <= 500) {
        let query2 = "INSERT INTO brute_force(ip_user, date_ban) VALUES ( ?, ?)";
        let values2 = [userIp, dateBan];
        con.query(query2, values2, function(err3, result3){
            if(err3) {
                console.log(err3);
            }
        });
    }
}


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

module.exports = { checkIfIpIsBan, checkIfPasswordIsGood, saveBruteForceData, sendMailByType}

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
