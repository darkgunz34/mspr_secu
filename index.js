const https = require('https');
const http = require('http');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const express = require('express');
const ldap = require('ldapjs');
const fs = require('fs')
const speakeasy = require('speakeasy');
const mailer = require('nodemailer');
const tools = require('./tools/tools.js');
const session = require('express-session');
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

//setup session
server.use(
    session({
    secret: 'mspr_secu',
    saveUninitialized: false,
    resave: false
    })
);

//setup mail
let transport = mailer.createTransport( {
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
        user: '1d6d2281b77d70',
        pass: '8681af2be1073d'
    }
});

let codeBarre = "";
let secretTemp = "";

con.getConnection()
    .then(conn => {
        conn.query("SELECT * FROM qr_code WHERE id = 1").then((res) => {
            codeBarre = '<img src="' + res[0].code + '">';
            secretTemp = res[0].secret;
        }).then(res => {
            conn.release();
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
    let userIp = req.ip;
    let nom = req.body.name;
    let password = req.body.password;
    let ban = tools.checkIfIpIsBan(con, userIp, res);

    if(ban){
        res.render('ban');
    }

    let result = authenticateDN("CN="+nom+",CN=Users,DC=chateletmspr,DC=ovh",password);

    if(result){
        //TODO : secure
        req.session.password = password;
        req.session.nom = nom;
        res.render('check');
    }

    if(userAttempts > 5) {
          tools.saveBruteForceData(con, bruteDelta, userIp, nom, transport)
          res.render('ban');
    }else {
          let timeStamp = Date.now();
          if(bruteTemp.length > 0) {
              bruteDelta.push(timeStamp - bruteTemp[bruteTemp.length -1]);
          }
          bruteTemp.push(timeStamp);
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
    
    //Récupération des données depuis la session
    let password = req.session.password;
    let nom = req.session.nom;

    // verification
    let corrompu = tools.check_password_api(password,crypto,https);
    
    if(verified) {
        res.render('login.ejs',{name:nom,password:password,corrompu:corrompu});
    }else{
        res.render('authentification.ejs',{img: codeBarre});
    }
})

server.get('/deconnexion', function(req, res){
    req.session.destroy();
    res.render('authentification.ejs',{img: codeBarre});
});

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
  response.redirect("https://" + request.headers.host + request.url);
});
httpApp.listen(80, () => console.log(`HTTP server listening: http://localhost:80`));

/*Callback Active Directory*/
function authenticateDN(username,password){
    let sync = true;
    let valeur_retour = false;
    let client = ldap.createClient({
        url: "ldap://192.168.1.33:389"
    });
    if(!password){
        password = "XXXX";
    }

    client.bind(username,password,function(err){
        console.log(username + " => " + password);
        if(err){
            console.log("Identifiant LDAP incorrect");
            valeur_retour = false;
        }else{
            console.log("Identifiant LDAP valide");
            valeur_retour = true;
        }
        sync = false;
    });

    while(sync) {require('deasync').sleep(100);}
    return valeur_retour;
};