const https = require('https');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const express = require('express');
const speakeasy = require('speakeasy');
const server = express();
const mailer = require('nodemailer');
const bcrypt = require('bcrypt');
const tools = require('./tools/tools.js');
let bruteTemp = [];
let bruteDelta = [];
let userAttempts = 1;
let mysql = require('mysql');
let con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "mspr_secu"
});
//setup emailer data
let transport = mailer.createTransport( {
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
        user: '1d6d2281b77d70',
        pass: '8681af2be1073d'
    }
});
// get qrCode and secret from db
let codeBarre = "";
let secretTemp = "";
con.connect(function(err) {
    let query = "SELECT * FROM qr_code WHERE id = 1";
    con.query(query, function(err, result) {
        codeBarre = '<img src="' + result[0].code + '">';
        secretTemp = result[0].secret;
    });
});

server.set('view engine', 'ejs');
server.use(bodyParser.urlencoded({ extended: true }));

server.get('/', (req, res) => {
    res.render('authentification', {img: codeBarre});
});

server.get('/authentification/', (req, res) => {
    res.render('authentification', {img: codeBarre});
});

server.post('/login', function(req, res){
  var userIp = req.ip;
  var nom = req.body.name;
  var password = req.body.password;
  var corrompu = fnpwnedpasswords(password); // A implenter dans la logic global
  tools.checkIfIpIsBan(con, userIp, res); // if ban renvoi sur ban.ejs
  tools.checkIfPasswordIsGood(con, nom, password, bcrypt, res); // if good renvoie sur check.ejs
    if(userAttempts > 5) {
        console.log('envoie mail ?')
        tools.saveBruteForceData(con, bruteDelta, userIp, nom, transport)
        res.render('ban');
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
    // TO DO envoie mail changement de navigateur et changement d'ip
});

// process de validation speakeasy TwoFactor
server.post('/check', function(req, res) {
    let code = req.body.code; // récupération du code entré par l'utilisateur
    let verified = speakeasy.totp.verify({
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
    }
    while(sync) {require('deasync').sleep(100);}
    return corrompu;
}



