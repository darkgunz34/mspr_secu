const speakeasy = require('speakeasy');

function checkCodeGoogle(code,secretTemp){
    return speakeasy.totp.verify({
        secret : secretTemp,
        encoding: 'base32',
        token: code
    });
}

module.exports = {checkCodeGoogle};