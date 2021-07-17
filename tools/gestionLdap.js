const ldap = require('ldapjs');
const sync = require('deasync');

/* Configuration LDAP */
let sufix = "DC=chateletmspr,DC=ovh";
let client = ldap.createClient({url: "ldap://192.168.1.33:389"});

function controleLdap(username,password){
    let synchro = true;
    compteTrouver = false;

    let appelBind = "CN="+username + ",CN=Users," + sufix;
    client.bind(appelBind,password,function(err){
        if(err){
            throw "Aucun compte n'est associé à cette utilisateur avec ce mot de passe";
        }
        synchro = false;
    });
    while(synchro) {sync.sleep(100);}
    return compteTrouver;
};


function recupererMailLdap(username,password){
    let synchro = true;
    let mailCompte = false;
    let appelBind = "CN="+username + ",CN=Users," + sufix;
    client.bind(appelBind,password,function(err){
        if(err){
            throw "Aucun compte n'est associé à cette utilisateur avec ce mot de passe";
        }
        client.search(sufix,{ filter: "(CN="+username+")",attributes: ['dn', 'sn', 'cn',"mail",],scope: 'sub',},(err,res) => {
            res.on('searchEntry', function(entry) {
                mail = JSON.stringify(entry.object.mail);
                if(mail){
                    mailCompte = mail.replace('"','').replace('"','');
                }else{
                    throw "Pas de mail configurer pour ce compte. Merci de contacter l'administrateur";
                }
                synchro = false;
            });    
        });
    });
    while(synchro) {sync.sleep(100);}
    return mailCompte;
}

module.exports = {controleLdap,recupererMailLdap};