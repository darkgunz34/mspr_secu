const mariadb = require('mariadb');
const sync = require('deasync');
const tools = require('./tools');

let pool = mariadb.createPool({
    host: "192.168.1.33",
    user: "serveur_web",
    password: "Epsi#1234!",
    database: "mspr_secu",
    port:3307
});

function recupererPoolConnexion(){
    return pool.getConnection();
}

function recuperationQrCode(){
    let codeBarre;
    let secretTemp;
    let synchro = true;
    recupererPoolConnexion()
    .then(conn => {
        conn.query("SELECT * FROM qr_code WHERE id = 1").then((res) => {
            codeBarre = '<img src="' + res[0].code + '">';
            secretTemp = res[0].secret;
        });
        conn.release();
        synchro = false;
    });

    while(synchro) {sync.sleep(100);}

    var arr = [];
    arr.push('secretTemp',secretTemp);
    arr.push('codeBarre',codeBarre);

    return {
        secretTemp: secretTemp,
        codeBarre: codeBarre};
};

function checkIfIpIsBan(ipUser) {
    let synchro = true;
    let bannis = false;
    recupererPoolConnexion()
        .then(conn => {
            let query = "SELECT * FROM brute_force WHERE ip_user = '" + ipUser + "'";
            conn.query(query).then((result) => {
                if(result.length > 0) {
                    bannis = true;
                }
            });
            conn.release();
            synchro = false;
        });

    while(synchro) {sync.sleep(100);}
    return bannis;
}

function declarationNouveauSupport(email,typeSupport,date) {
    let synchro = true;
    recupererPoolConnexion()
        .then(conn => {
            let query = "INSERT INTO access (a_mail,a_agent,a_date,a_active) VALUES ('"+email+"','"+typeSupport+"', '"+tools.convertDate(date)+"','false')";
            conn.query(query);

            conn.release();
            synchro = false;
        });
    while(synchro) {sync.sleep(100);}
};

function controleAccess(mail,code){
    let synchro = true;
    let retour = false;
    recupererPoolConnexion()
        .then(conn => {
            let query = "SELECT * FROM access_validation WHERE mail = '"+ mail + "' and code = '" + code + "'"; 
            let rs =  conn.query(query).then((result) => {
                if(result.length > 0) {
                    retour = true;
                }
            });
            conn.release();
            synchro = false;
        });

    while(synchro) {sync.sleep(100);}
    return retour;
}

function checkUserAgent(mail, agent) {
    let synchro = true;
    let retour = false;
    recupererPoolConnexion()
        .then(conn => {
            let query = "SELECT * FROM access WHERE a_mail = '" + mail + "' and a_active = 'true' and a_agent = '"+ agent +"' ORDER BY a_date DESC LIMIT 1";
            conn.query(query)
                .then((result) => {
                    if(result.length > 0) {
                        retour = true;
                    }
                conn.release();
                synchro = false;
            });
    });
    while(synchro) {sync.sleep(100);}
    return retour;
}

function saveBruteForceData(bruteDelta, userIp) {
    let synchro = true;
    recupererPoolConnexion()
        .then(conn => {
        let arrayTimeStampSum = bruteDelta.reduce((a,b) => a + b, 0);
        let dateBan = tools.convertDate(new Date());
        if(( arrayTimeStampSum / (bruteDelta.length - 1)) <= 500) {
            let query2 = "INSERT INTO brute_force(ip_user, date_ban) VALUES ( '" + userIp + "','" + dateBan + "')";
            conn.query(query2);
            conn.release();
            synchro=false;
        }
    });
    while(synchro) {sync.sleep(100);}
};

function getAgentFromAccessValidation(mail,code){
    let synchro = true;
    let valeur_retour;
    recupererPoolConnexion()
        .then(conn => {
            let query = "SELECT agent FROM access_validation WHERE mail = '" + mail +"' and code = '" + code +"'";
            conn.query(query).then((result) => {
                if(result.length > 0) {
                    valeur_retour = result[0].agent;
                }
            });
            synchro = false;
            conn.release();
        });
    while(synchro) {sync.sleep(100);}
    return valeur_retour;
}

function enAttente(code,mail,date,agent){
    recupererPoolConnexion()
    .then(conn => {
        let query = "INSERT INTO access_validation(mail,date,code,agent) VALUES ('"+mail+"','"+tools.convertDate(date)+"','"+code+"','"+ agent +"')";
        conn.query(query);
        conn.release();
    });
}

function updateAccess(mail,agent){
    recupererPoolConnexion()
    .then(conn => {
        let query = "UPDATE access SET a_active = 'true' WHERE a_mail = '"+ mail +"' and a_agent = '"+agent+"'";
        conn.query(query);  
        conn.release();
    });
}

module.exports = {controleAccess,recuperationQrCode,checkIfIpIsBan,declarationNouveauSupport,checkUserAgent,saveBruteForceData,updateAccess,enAttente,getAgentFromAccessValidation};