const mariadb = require('mariadb');

let con = mariadb.createPool({
    host: "192.168.1.33",
    user: "serveur_web",
    password: "Epsi#1234!",
    database: "mspr_secu",
    port:3307
});

function recupererPoolConnexion(){
    return con.getConnection();
}

function recuperationElementBaseDeDonnes(requete){
    return recupererPoolConnexion().then(pool => {
        return executerConnexionAvecRetour(pool,requete);
    });
}

function executerConnexionAvecRetour(connection,requete){
    return connection.query("SELECT * FROM qr_code WHERE id = 1";
};

module.exports = {recuperationElementBaseDeDonnes};