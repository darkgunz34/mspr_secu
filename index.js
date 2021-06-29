const https = require('https');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const express = require('express');
const speakeasy = require('speakeasy');
const server = express();
const bcrypt = require('bcrypt');
//const salt = 10;
var bruteTemp = [];
var bruteDelta = [];
var userAttempts = 1;
var mysql = require('mysql');
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "mspr_secu"
});

server.set('view engine', 'ejs');
server.use(bodyParser.urlencoded({ extended: true }));

var secret = speakeasy.generateSecret();
var secretTemp = secret.base32;
var QRCode = require('qrcode');


server.get('/', (req, res) => {
    QRCode.toDataURL(secret.otpauth_url, function(err, data_url) {
        // ajout de l'image à scanner
        res.render('authentification', { img : '<img src="' + data_url + '">'});
    })
});

server.get('/authentification/', (req, res) => {
    QRCode.toDataURL(secret.otpauth_url, function(err, data_url) {
        // ajout de l'image à scanner
        res.render('authentification', { img : '<img src="' + data_url + '">'});
    })
});

server.post('/login', function(req, res){
  var userIp = req.ip;
  var nom = req.body.name;
  var password = req.body.password;
  var corrompu = fnpwnedpasswords(password);
  // vérifier si l'ip est bannis
    con.connect(function(err1) {
        var query = "SELECT * FROM brute_force WHERE ip_user = ?";
        var values = userIp;
        con.query(query,values, function(err1, result1) {
            if(err1) throw err1;
            if(result1.length > 0) {
                res.render('ban');
            }
        });
    });

    // récuperer le mot de passe sauvegarder pour vérification
    con.connect(function(err) {
        var query = "SELECT * FROM user WHERE identifiant = ?";
        var values = nom;
        con.query(query,values, function(err, result) {
            if(err) console.log(err);
           if(result.length > 0) {
               bcrypt.compare(password, result['password'], function(err2, result2) {
                   if(result2) {
                        res.render('check');
                   } else {
                       if(userAttempts > 5) {
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
                           res.render('ban')
                       } else {
                           let timeStamp = Date.now();
                           if(bruteTemp.length > 0) {
                               bruteDelta.push(timeStamp - bruteTemp[bruteTemp.length -1]);
                               console.log(bruteDelta);
                           }
                           bruteTemp.push(timeStamp);
                           userAttempts++
                           console.log("mot de passe incorrect !");
                           console.log(userAttempts);
                       }
                   }
               })
           }
        });
    });
});

// process de validation speakeasy TwoFactor
server.post('/check', function(req, res) {
    var code = req.body.code; // récupération du code entré par l'utilisateur
    var verified = speakeasy.totp.verify({
        secret : secretTemp,
        encoding: 'base32',
        token: code
    });
    // verification
    if(verified) {
        res.render('success.ejs');
    } else {
        console.log("et non gros connard");
    }
})

server.listen(4242, () => {
  console.log('Express Server is running...');
});

server.use(express.static(__dirname + '/public'));

// https://www.video-game-codeur.fr/node-js-form-post-get-express-url/

function fnpwnedpasswords(password){
    var sync = true;
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
        console.log(`Error : ${err}`);
    });
    function onEnd(){
        let res = hashes.split('\r\n').map((h) => {
            let sp = h.split(':');
            console.log(prefix + sp[0]);
            return{
                hash: prefix + sp[0],
                count: parseInt(sp[1])
            }
        });
        let found = res.find((h) => h.hash == hashedPassword);
        if ( found ){
            return 1;
        }else{
            return 0;
        }
    };
    while(sync) {require('deasync').sleep(100);}
    return corrompu;
};

/*
* bcrypt.genSalt(salt, function(err, salt) {
            bcrypt.hash('mot_de_passe_user', salt, function(err, hash) {
                console.log(hash);
            });
        });
* */

