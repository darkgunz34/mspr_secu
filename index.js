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
const useragent = require('useragent');

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
    let nom = req.session.nom;
    let password = req.session.password;
    let ban = tools.checkIfIpIsBan(con, userIp);

    if(ban){
        res.render('ban');
    }

    let mail = authenticateDN("CN="+nom,password);

    if(mail!==false){
        let agent = tools.recuperationAgentFromRequest(req);

        if(tools.checkUserAgent(mail,con,agent)){
            req.session.password = password;
            req.session.nom = nom;
            res.render('check');
        }else{
            let date = Date.now();
            //génération d'un code
            code = Math.random()*1000;
            //insert table temp_access
            tools.enAttente(code,mail,date,agent,con);
            //send mail
            tools.sendMailByType(mail, 1, transport,code);
            tools.declarationChangementSupport(mail,adresse_ip,typeSupport,date);
            res.render('wait');
        };
    }

    if(compteurBrutforce > 5) {
          tools.saveBruteForceData(con, bruteDelta, userIp, nom, transport)
          res.render('ban');
    }else {
          let timeStamp = Date.now();
          bruteTemp.push(timeStamp);
          compteurBrutforce++;
          res.render('authentification',{img: codeBarre});
      }
});

//Après envoie de mail
server.post('/valid', function(req, res) {
    let code = req.code;
    let mail = req.mail;
    if(mail && code){
        if(tools.checkValide(con,mail,code)){
            tools.getAgentFromAccessValidation(con,mail,code);
            tools.updateAccess(con,mail,agent);
            res.render('authentification',{img: codeBarre,message:"Vous pouvez maintenant vous reconnecter"});
        }
    }
    res.render('authentification',{img: codeBarre,message:"Impossible de réaliser la mise à jour"});
});


server.post('/check', function(req, res) {
    let code = req.body.code; // récupération du code depuis l'authentification Google
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
        res.render('login',{corrompu:corrompu});
    }else{
        res.render('authentification',{img: codeBarre});
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

function authenticateDN(username,password){
    let sufix = "DC=chateletmspr,DC=ovh";
    let sync = true;
    let valeur_retour = false;
    let client = ldap.createClient({
        url: "ldap://192.168.1.33:389"
    });
    if(!password){
        password = " ";
    }

    let appelBind = username + ",CN=Users," + sufix
    client.bind(appelBind,password,function(err){
        if(err){
            console.log("Identifiant LDAP incorrect");
        }else{
            console.log("Identifiant LDAP valide");
            client.search(sufix,{ filter: "("+username+")",attributes: ['dn', 'sn', 'cn',"mail",],scope: 'sub',},(err,res) => {
                console.log(res);
                res.on('searchEntry', function(entry) {
                    valeur_retour = JSON.stringify(entry.object.mail)
                });
                sync = false;
            });
        }
    });

    while(sync) {require('deasync').sleep(100);}
    return valeur_retour;
};