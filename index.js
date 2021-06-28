const https = require('https');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const express = require('express');
const speakeasy = require('speakeasy');
const server = express();

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
  var nom = req.body.name;
  var password = req.body.password;
  var corrompu = fnpwnedpasswords(password);

  //res.render('login',{name:nom,password:password,corrompu:corrompu});
    // renvoie sur la page de validation
  res.render('check');
});

// process de validation speakeasy TwoFactor
server.post('/check', function(req, res) {
    var code = req.body.code; // récupération du code entrez par l'utilisateur
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

