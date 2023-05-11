
const nodemailer = require('nodemailer')


// var OTPOption = {
//     from: 'anh97059@gmail.com',
//     to: `${email}`,
//     subject: 'OTP CODE',
//     text: `Please enter otp code to change password: ${password}`
// }

// transporter.sendMail(OTPOption, function(error, info){
//     if(error){
//         console.log(error);
//     } else {
//         console.log('Email sent: ' + info.response);
//     }
// });

// var transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: 'anh97059@gmail.com',
//         pass: `${process.env.EMAILPASSWORD}`
//     }
// })

const generatePassword = function generateRandom3Characters(size) {
    var generatedOutput= '';
    var storedCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var totalCharacterSize = storedCharacters.length;

    for ( var index = 0; index < size; index++ ) {
       generatedOutput+=storedCharacters.charAt(Math.floor(Math.random() *
       totalCharacterSize));
    }
    return generatedOutput;
};

const generateUser = function randomUsername(size){
    var generatedOutput= '';
    var storedCharacters = '0123456789';
    var totalCharacterSize = storedCharacters.length;
    for ( var index = 0; index < size; index++ ) {
       generatedOutput+=storedCharacters.charAt(Math.floor(Math.random() * totalCharacterSize));
    }
    return generatedOutput;
}

module.exports = {
    generateUser,
    generatePassword
}