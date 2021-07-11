const https = require('https');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const express = require('express');
const ldap = require('ldapjs');

const server = express();


server.set('view engine', 'ejs');
server.use(bodyParser.urlencoded({ extended: true }));

server.get('/', (req, res) => {
  res.render('authentification');
});

server.get('/authentification/', (req, res) => {
  res.render('authentification');
});

server.post('/login', function(req, res){
  var nom = req.body.name;
  var password = req.body.password;
  authenticateDN("CN=stephan,CN=Users,DC=chateletmspr,DC=ovh","Epsi#1234!");
  var corrompu = fnpwnedpasswords(password);
  console.log('nom :' + nom + " " + req);
  res.render('login',{name:nom,password:password,corrompu:corrompu});
});

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
          //  console.log(prefix + sp[0]);
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