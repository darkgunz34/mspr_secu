/**
 * Méthode pour vérifier si le mot de passe à déjà été détecter comme pirater.
 * @param {*} password Le mot de passe à contrôler
 * @param {*} crypto La crypto pour le hash du password.
 * @param {*} https protocole pour consommer l'API
 * @returns boolean true si le mpd est corrompu. False dans le cas intverse.
 */
 function check_password_api(password,crypto,https){
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
        console.log(`Erreur durant l'appel API : ${apiCall} => ${err}`);
    });
    function onEnd(){
        let res = hashes.split('\r\n').map((h) => {
            let sp = h.split(':');
            return{
                hash: prefix + sp[0],
                count: parseInt(sp[1])
            };
        });
        let found = res.find((h) => h.hash === hashedPassword);
        if ( found ){
            return true;
        }else{
            return false;
        };
    };
    while(sync) {require('deasync').sleep(100);}
    return corrompu;
};

module.exports = {check_password_api}