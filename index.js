const https = require('https');
const http = require('http');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const express = require('express');

const fs = require('fs')
const mailer = require('nodemailer');
const tools = require('./tools/tools.js');
const gestionBaseDeDonnees = require('./tools/gestionBaseDeDonnees');
const gestionLdap = require('./tools/gestionLdap');
const gestionApi = require('./tools/gestionApi');
const gestionAuthentification = require('./tools/gestionAuthentification');
const session = require('express-session');
const server = express();
const serveurHttp = express();
const useragent = require('useragent');

let bruteTemp = [];
let bruteDelta = [];
let compteurBrutforce = 1;


/* Configuration Session */
server.use(
    session({
    secret: 'mspr_secu',
    saveUninitialized: false,
    resave: false
    })
);

/* Configuration Mail */
let transport = mailer.createTransport( {
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
        user: '1d6d2281b77d70',
        pass: '8681af2be1073d'
    }
});



/* Configuration du serveur */
server.set('view engine', 'ejs');
server.use(express.static(__dirname + '/public'));
server.use(bodyParser.urlencoded({ extended: true }));    

https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, server)
  .listen(443, function () {
    console.log('Serveur en HTTPS : UP');
});

serveurHttp.get("*", function(request, response){
  response.redirect("https://" + request.headers.host + request.url);
});
serveurHttp.listen(80, () => console.log(`Serveur en HTTP : redirige vers HTTPS`));


/* Préparation des données pour le QrCode*/
QrCodeDepuisTable = gestionBaseDeDonnees.recuperationQrCode();
let codeBarre = QrCodeDepuisTable.codeBarre;
let secretTemp = QrCodeDepuisTable.secretTemp;

/* Traitement des requêtes */
server.get('/', (req, res) => {
    res.render('authentification', {img: codeBarre,message:""});
});

server.get('/authentification/', (req, res) => {
    res.render('authentification', {img: codeBarre,message:""});
});

server.get('/valide',function(req,res){
    res.render('valide');
})

server.get('/logout', function(req, res){
    req.session.destroy();
    res.render('authentification',{img: codeBarre,message:"Vous n'êtes plus connecter"});
});


server.post('/login', function(req, res){
    let userIp = req.ip;
    let nom = req.body.nom;
    let password = req.body.password;

    if(gestionBaseDeDonnees.checkIfIpIsBan(userIp)){
        res.render('ban');
    }
    
    if(compteurBrutforce > 5) {
        gestionBaseDeDonnees.saveBruteForceData(bruteDelta, userIp, nom, transport)
        res.render('ban');
    }

    try {
        champNonVide(password);
        gestionLdap.controleLdap(nom,password);
        let mail = gestionLdap.recupererMailLdap(nom,password);
        let agent = tools.recuperationAgentFromRequest(req,useragent);
        if(gestionBaseDeDonnees.checkUserAgent(mail,agent)){
            req.session.password = password;
            req.session.nom = nom;
            res.render('check');
        }else{
            let date = new Date();
            code = Math.random()*1000;
            gestionBaseDeDonnees.enAttente(code,mail,date,agent);
            tools.sendMailByType(mail, 1, transport,code);
            gestionBaseDeDonnees.declarationNouveauSupport(mail,agent,date);
            res.render('wait');
        }
    }
    catch (messageErreur) {
        let timeStamp = new Date();
        bruteTemp.push(timeStamp);
        compteurBrutforce++;
        console.log("start");
        res.render('authentification',{img: codeBarre,message:messageErreur});
    }
});

//Après envoie de mail
server.post('/valide', function(req, res) {
    let code = req.body.code;
    let mail = req.body.mail;

    if(mail && code){
        if(gestionBaseDeDonnees.controleAccess(mail,code)){
            let agent = gestionBaseDeDonnees.getAgentFromAccessValidation(mail,code);
            gestionBaseDeDonnees.updateAccess(mail,agent);
            res.render('authentification',{img: codeBarre,message:"Vous pouvez maintenant vous connecter avec votre nouveau navigateur"});
        }
    }
    res.render('authentification',{img: codeBarre,message:"Impossible de réaliser la mise à jour"});
});


server.post('/check', function(req, res) {
    let code = req.body.code;
    let verified = gestionAuthentification.checkCodeGoogle(code,secretTemp);

    //Récupération des données depuis la session
    let password = req.session.password;

    // verification
    let corrompu = gestionApi.check_password_api(password,crypto,https);
    
    if(corrompu) {
        res.render('login',{corrompu:corrompu});
    }else{
        res.render('authentification',{img: codeBarre,message:""});
    }
})

function champNonVide(champ){
    if(!champ){
        throw "Merci de saisir l'ensemble des champs";
    }
}