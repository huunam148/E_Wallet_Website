const User = require('../models/user')
const Account = require('../models/account')
const {cloudinary} = require('../cloudinary/index')
const nodemailer = require('nodemailer')
var express = require('express');
var router = express.Router();
const ExpressError= require('../utils/ExpressError')
const {registerSchemas} = require('../schemas.js')
const catchAsync = require('../utils/catchAsync'); 
const {generateUser, generatePassword} = require('../middleware')
const { default: mongoose } = require('mongoose');



module.exports.createUser =  async (req, res, next) =>{
    const email = req.body.email;
    const existUser =  await User.findOne({email: email});

    if(existUser){
        res.redirect('/users/register')
    } else {
        const userAccount = generateUser(10);
        const user = new User(req.body);
        
        req.session.email = email;
        req.session.userAccount = userAccount;

        user.images = req.files.map(f => ({url: f.path, filename: f.filename}));
        await user.save();
        await createAccount(email, userAccount);

        // const account = await Account.findOne({username: userAccount}, function(err, doc){
        //     if(err){
        //         console.log(err);
        //     }
        //     console.log(doc);
        // }).clone();

        res.redirect('/users/firstTime')
    }
}

module.exports.sendOTP = async(req, res, next) =>{
    const email = req.body.email;
    req.session.email = email;
    const otp = generateUser(6)
    req.session.otp = otp;

    var optOption = {
        from: `${process.env.EMAIL}`,
        to: `${email}`,
        subject: 'Your OTP Code',
        text: `Entern your OTP Code: ${otp}`
    };

    transporter.sendMail(optOption, function(error, info){
        if(error){
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
    res.redirect('otp')
}

const createAccount = async function(email, userAccount){
    
    const password = generatePassword(6)
    const account =  new Account(
        {
            username: userAccount,
            password: password,
            state: 'notValidated',
            failureTime: 0,
        }
        
    )
    // account.history = [{
    //     transactionType: 'null',
    //     money: 0,
    //     state: 'null'
    // }]
    await account.save();

    var mailOptions = {
        from: `${process.env.EMAIL}`,
        to: `${email}`,
        subject: 'Your New Account',
        text: `Username: ${userAccount} \n` +  `Password: ${password}`
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: `${process.env.EMAIL}`,
        pass: `${process.env.EMAILPASSWORD}`
    }
})

router.use((err, req, res, next) =>{
    const {statusCode = 500} = err;
    if(!err.message) err.message = 'Oh no no, something went wrong';
    res.status(statusCode).render('error', {err});
  })
  