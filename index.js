const https = require('https');
const http = require('http');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const express = require('express');
const ldap = require('ldapjs');
const fs = require('fs')
const speakeasy = require('speakeasy');
const mailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const tools = require('./tools/tools.js');
const server = express();

let bruteTemp = [];
let bruteDelta = [];
let userAttempts = 1;
let mariadb = require('mariadb');
let con = mariadb.createPool({
    host: "192.168.1.33",
    user: "serveur_web",
    password: "Epsi#1234!",
    database: "mspr_secu",
    port:3307
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

con.getConnection()
    .then(conn => {
        conn.query("SELECT * FROM qr_code WHERE id = 1").then((res) => {
            codeBarre = '<img src="' + res[0].code + '">';
            secretTemp = res[0].secret;
        }).then(res => { // res: { affectedRows: 1, insertId: 1, warningStatus: 0 }
            conn.release(); // release to pool
          });
    });

/*con.connect(function(err) {
    let query = "SELECT * FROM qr_code WHERE id = 1";
    con.query(query, function(err, result) {
        codeBarre = '<img src="' + result[0].code + '">';
        secretTemp = result[0].secret;
    });
});
*/

server.set('view engine', 'ejs');
server.use(bodyParser.urlencoded({ extended: true }));

server.get('/', (req, res) => {
	console.log(req.headers.host);
	console.log(req.url);
    res.render('authentification', {img: codeBarre});
});

server.get('/authentification/', (req, res) => {
    res.render('authentification', {img: codeBarre});
});

server.post('/login', function(req, res){
//  authenticateDN("CN=stephan,CN=Users,DC=chateletmspr,DC=ovh","Epsi#1234!");
    let userAgent = req.headers['user-agent']
    let userIp = req.ip;
    let nom = req.body.name;
    let password = req.body.password;
    let corrompu = fnpwnedpasswords(password); // A implenter dans la logic global
    tools.checkIfIpIsBan(con, userIp, res); // if ban renvoi sur ban.ejs
    tools.checkIfPasswordIsGood(con, nom, password, bcrypt, res); // if good renvoie sur check.ejs
    tools.checkUserAgent(nom,userAgent,con,transport);
      if(userAttempts > 5) {
          console.log('envoie mail ?')
          tools.saveBruteForceData(con, bruteDelta, userIp, nom, transport)
          res.render('ban');
      } else {
          console.log("FUCK");
          let timeStamp = Date.now();
          if(bruteTemp.length > 0) {
              bruteDelta.push(timeStamp - bruteTemp[bruteTemp.length -1]);
              console.log(bruteDelta);
          }
          bruteTemp.push(timeStamp);
          console.log("Compteur " + userAttempts);
          userAttempts++;
          res.render('authentification',{img: codeBarre});
      }
});

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

server.use(express.static(__dirname + '/public'));

/* START SERVEUR*/
https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, server)
  .listen(443, function () {
    console.log('Express Server is running... https://localhost:443/');
});

//Forcé la redirection
const httpApp = express();
httpApp.get("*", function(request, response){
console.log(request.headers.host);
console.log(request.url);
  response.redirect("https://" + request.headers.host + request.url);
});
httpApp.listen(80, () => console.log(`HTTP server listening: http://localhost:80`));

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
          //  console.log(prefix + sp[0]);
            return{
                hash: prefix + sp[0],
                count: parseInt(sp[1])
            };
        });
        let found = res.find((h) => h.hash == hashedPassword);
        if ( found ){
            return 1;
        }else{
            return 0;
        };
    };
    while(sync) {require('deasync').sleep(100);}
    return corrompu;
};

/*Callback Active Directory*/
function authenticateDN(username,password){
    var client = ldap.createClient({
        url: "ldap://SRV01.chateletmspr.ovh:389"
    });
    client.bind(username,password,function(err){
        if(err){
            console.log("Vas Te Faire Foutre : " + err);
        }else{
            console.log("Success");
        }
    })
}
