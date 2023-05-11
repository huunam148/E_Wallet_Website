if(process.env.NODE_ENV !== "production"){
  require('dotenv').config();
}

//console.log(process.env.SECRET);
var express = require('express');
var router = express.Router();
const multer = require('multer');
const {storage} = require('../cloudinary/index');
const upload = multer({storage});
const catchAsync = require('../utils/catchAsync');
const userController = require('../controllers/users');
const User = require('../models/user')
const Account = require('../models/account')
const bcrypt = require('bcrypt')
const saltRounds = 10;
const ExpressError= require('../utils/ExpressError')
const {changePassFirstSchemas} = require('../schemas.js');
const { default: mongoose} = require('mongoose');
const CreditCard = require('../models/creditCard')
const MobileCard = require('../models/mobileCard')

const random = (min = 10000, max = 50000) => {
  let num = Math.random() * (max - min) + min;

  return Math.round(num);
};

const isLoggin = (req, res, next) =>{
  if(!req.session.userId){
    return res.redirect('/users/login')
  }
  next();
}

const isLocked = async (req, res ,next) =>{
  const account = await Account.findById({_id: mongoose.Types.ObjectId(req.session.userId)}, function(err, acc){
    if(err){
      console.log(err);
    }
    if(acc.state == "locked"){
      req.flash('locked', 'Your account was locked')
      res.redirect('/users/login')
    }
  }).clone()
  next()
}

const isValidate = async (req, res, next) =>{
  const account = await Account.findById({_id: mongoose.Types.ObjectId(req.session.userId)}, function(err, acc){
    if(err){
      console.log(err);
    }
    if(acc.state == "notValidated"){
      req.flash('notValidated', 'Your account was not validated')
      res.redirect('/users')
    }
  }).clone()
  next()
}

const validateChangePassFirst = (req, res, next) =>{
  const {error} = changePassFirstSchemas.validate(req.body);

  if(error){
    const msg = error.details.map(el => el.message).join(',')
    throw new ExpressError(msg, 400)
  } else {
    next();
  }
} 

router.get('/', isLoggin, isLocked, async function(req, res, next) {
  const account = await Account.findById({_id: mongoose.Types.ObjectId(req.session.userId)}).clone()
  //res.send(req.flash('loginSuccess'))
  res.render('mainLayoutUser', {account, messages: req.flash('loginSuccess'), notValidated: req.flash('notValidated')})
})

router.get('/register', function(req, res, next){
  res.render('signUp');
})

router.post('/register', upload.any('frontImage', 'backImage'), catchAsync(userController.createUser), function(req, res, next){
  //console.log(req.body);
  //console.log(req.files);
})

router.get("/login", function(req, res, next) {
  
  res.render('login' , {locked: req.flash('locked')});
})

router.post('/login', async function(req, res, next) {
  const username = req.body.username;
  const password = req.body.password;
  //console.log(password);
  const account = await Account.findOne({username: username})
  const hash = account.password;

  bcrypt.compare(password, hash, function(err, result) {
    console.log(result);
    if(result == true){
      req.session.state = account.state;
      req.session.userId = account._id;
      req.flash('loginSuccess', 'Login successfull!')
      res.redirect('/users')
    } else {
      res.redirect('/users/login')
    }
  });

})

router.get('/logout', function(req, res, next) {
  req.session.userId = null;
  req.session.destroy();
  res.redirect('/users/login')
})

router.get('/firstTime', catchAsync(async (req, res, next) => {
  const userAccount = await  Account.findOne({username: req.session.userAccount})
  const user = await User.findOneAndUpdate({email: req.session.email}, {accounts: userAccount._id})
  const email = req.session.email;
  res.render('changePassFirstTime');
}))

router.post('/firstTime', validateChangePassFirst, catchAsync(async (req, res, next) => {
  const firstPassword = req.body.firstPassword;
  const secondPassword = req.body.secondPassword;
  if(firstPassword !== secondPassword) throw new ExpressError('Password does not match', 400)

  const userAccount = await  Account.findOne({username: req.session.userAccount})

  bcrypt.hash(firstPassword, saltRounds, function(err, hash) {
    userAccount.password = hash;
    userAccount.save();
  })
  res.redirect('/users');
}))

router.get('/transferMoney', isLoggin, isValidate, (req, res, next) =>{
  res.render('transferMoney');
})

router.get('/addMoney', isLoggin, isValidate, (req, res, next) =>{
  res.render('addMoney', {card: req.flash('card'), success: req.flash('successCard')});
})

router.post('/addMoney', isLoggin, async (req, res, next) =>{
  const {money, cardNumber, expireDate, cvv} = req.body;
  const user = await User.findOne({accounts: req.session.userId}).clone()
  const account = await Account.findById({_id: mongoose.Types.ObjectId(req.session.userId)}).clone()

  const creditCard = await CreditCard.findOne({number: cardNumber}, async function(err, result){
    if(err){
      req.flash('card', 'Not Found Card Number')
      return res.redirect('/users/addMoney')
    } else {
      if(result.cvv !== cvv && result.expireDate !== expireDate){
        req.flash('card', 'Invalid CVV or ExpireDate')
        return res.redirect('/users/addMoney')
      }
      if(cvv == 411){
        await user.updateOne({$inc: {balance: money}})
        result.money = (result.money) - money;
        await result.save()
        await user.save()
        await account.updateOne({$push: {history: [{transactionType: 'creditCard', money: money, state: 'done', transactionTime: Date.now(), cardNumber: cardNumber}]}})
        req.flash('successCard', 'Add money Successfully!')
        return res.redirect('/users/addMoney')

      } else if (cvv == 443) {
        if (money > 1000000) {
          req.flash('card', 'Cannot withdrawl more than 1 million')
          res.redirect('/users/addMoney')
        } else {
          await user.updateOne({$inc: {balance: money}})
          result.money = (result.money) - money;
          await result.save()
          await user.save()
          await account.updateOne({$push: {history: [{transactionType: 'creditCard', money: money, state: 'done', transactionTime: Date.now(), cardNumber: cardNumber}]}})
          req.flash('successCard', 'Add money Successfully!!!')
          return res.redirect('/users/addMoney')
        }

      } else if (cvv == 577){
        req.flash('card', 'Out of Money')
        return res.redirect('/users/addMoney')
      }
    }
  }).clone()
})

router.get('/withdrawal', isLoggin, isValidate, async(req, res, next) =>{
  res.render('withdrawalMoney', {card: req.flash('card'), success: req.flash('successCard')})
})

router.post('/withdrawal', async(req, res, next) =>{
  const {money, cardNumber, expireDate, cvv, messages} = req.body;
  const user = await User.findOne({accounts: req.session.userId}).clone()
  const account = await Account.findById({_id: mongoose.Types.ObjectId(req.session.userId)}).clone()
  if(cardNumber != 111111){
    req.flash('card', 'Just accept card number: 111111')
    return res.redirect('/users/withdrawal')
  }

  const creditCard = await CreditCard.findOne({number: cardNumber}, async function(err, result){
    if(err){
      req.flash('card', 'Not found card number')
      return res.redirect('/users/withdrawal')
    } else {
      if(result.number !== cardNumber && result.expireDate !== expireDate && result.cvv !== cvv){
        req.flash('card', 'Please check cardnumber or expireDate, cvv again!')
        return res.redirect('/users/withdrawal')
      }
      if(money % 50000 !== 0){
        req.flash('card', 'phải là bội số của 50000!')
        return res.redirect('/users/withdrawal')
      } 
      else if (money > 5000000){

        await account.updateOne({$push: {history: [{transactionType: 'withdrawal', money: money, state: 'waiting', transactionTime: Date.now(), messages: messages, cardNumber: cardNumber}]}})
        req.flash('card', 'Please Wait Admin Accept The Transaction')
        return res.redirect('/users/withdrawal')
      } else {
        user.balance = user.balance - money - (money * 0.1);
        await result.updateOne({$inc: {money: money}})
        await account.updateOne({$push: {history: [{transactionType: 'withdrawal', money: money, state: 'done', transactionTime: Date.now(), messages: messages, cardNumber: cardNumber}]}})
        await user.save();
        req.flash('successCard', 'Withdrawl Money Successfully!')
        return res.redirect('/users/withdrawal')
      }
    }
  }).clone()
})

router.get('/updateProfile', isLoggin, async (req, res, next) =>{
  //const account = req.session.userId;
  const user = await User.findOne({accounts: req.session.userId})
  res.render('updateProfile', {user});
})

router.post('/updateProfile', isLoggin, async (req, res, next) =>{
  const {name, phoneNumber, email, address, birthday} = req.body;
  //const account = req.session.userId;
  const user = await User.findOne({accounts: req.session.userId})
  
  user.name = name;
  user.phoneNumber = phoneNumber;
  user.email = email;
  user.address = address;
  user.birthday = birthday;
  user.save()
  res.redirect('/users');
})

router.get('/userProfile', isLoggin, catchAsync(async(req, res, next) =>{
  //console.log(req.session.userId);
  const user = await User.findOne({accounts: req.session.userId})
  const account = await Account.findById({_id: mongoose.Types.ObjectId(req.session.userId)}).clone()
  //console.log(user.images[0].url);
  //console.log(user);

  res.render('userProfile', {user, account})
}))

router.get('/changePass', isLoggin, (req, res, next) => {
  res.render('changePass');
})

router.post('/changePass', isLoggin, catchAsync( async (req, res, next) => {
  const accountId = req.session.userId;
  const {oldPassword, newPassword, confirmPassword} = req.body;
  const account =  await Account.findById(accountId);

  bcrypt.compare(oldPassword, account.password,async function(err, isCorrectPass){
    if(isCorrectPass){
      if(newPassword == confirmPassword){
          bcrypt.hash(confirmPassword, saltRounds,async function(err, hash){
          account.password = hash;
          account.save();
        })
        res.redirect('/users');
      }
    }
    res.redirect('/users/changePass')
  })
  
}))

router.get('/otp', (req, res, next) =>{
  res.render('enterOTP')
})

router.post('/otp', (req, res, next) =>{
  const confirmOtp = req.body.otp;
  if(confirmOtp == req.session.otp){
    res.redirect('/users/restore')
  } else {
    res.redirect('/users/otp')
  }
})

router.get('/restore', (req, res, next) =>{
  res.render('restorePass')
})

router.post('/restore',async (req, res, next) =>{
  const {newPassword, confirmPassword} = req.body;
  const user = await User.findOne({email: req.session.email})
  //console.log(user.accounts[0]);
  const account = await Account.findById(user.accounts)

  if (newPassword == confirmPassword) {
    bcrypt.hash(newPassword, saltRounds, function(err, hash){
      if (err) {
        console.log(err, "Not Found Account");
      }
      account.password = hash;
      account.save();
    })
    res.redirect('/users/login')
  }

  res.redirect('/users/restore')
})

router.get('/email', (req, res, next) =>{
  res.render('enterEmail')
})

router.post('/email', catchAsync(userController.sendOTP), function (req, res, next) {
  
})

router.get('/buyCard', isLoggin, isValidate,  async(req, res, next) => {

  res.render('buyMobileCard', {card: req.flash('card'), success: req.flash('successCard')})
})

router.post('/buyCard', isLoggin, async(req, res, next) => {
  const {card, type, cardNumber} = req.body;
  const user = await User.findOne({accounts: mongoose.Types.ObjectId(req.session.userId)}).clone()
  console.log(user);
  const account = await Account.findById({_id: mongoose.Types.ObjectId(req.session.userId)}).clone()
  const mobileCard = await MobileCard.findOne({number: cardNumber})
  console.log(mobileCard);
  if(user.balance < card){
    req.flash('card', 'Not ennough money to buy card')
    return res.redirect('/users/buyCard')
  }
  if(card == "Viettel" && cardNumber == "11111"){
    user.balance = user.balance - type;
    await user.save();
    await account.updateOne({$push: {history: [{transactionType: 'mobileCard', money: type, state: 'done', transactionTime: Date.now(), cardNumber: 11111}]}})
    account.save()
    req.flash('successCard', 'Bought Card Successfully!')
    return res.redirect('/users/buyCard')

  } else if (card == "Mobifone" && cardNumber == "22222"){
    user.balance = user.balance - type;
    await user.save();
    await account.updateOne({$push: {history: [{transactionType: 'mobileCard', money: type, state: 'done', transactionTime: Date.now(), cardNumber: 22222}]}})
    await account.save();
    req.flash('successCard', 'Bought Card Successfully!')
    return res.redirect('/users/buyCard')

  } else if (card == "Vinaphone" && cardNumber == "33333"){
    user.balance = user.balance - type;
    await user.save();
    await account.updateOne({$push: {history: [{transactionType: 'mobileCard', money: type, state: 'done', transactionTime: Date.now(), cardNumber: 33333}]}})
    await account.save()
    req.flash('successCard', 'Bought Card Successfully!')
    return res.redirect('/users/buyCard')
  }
  res.redirect('/users/buyCard')
})

router.get('/validate/:id', isLoggin, async (req, res, next) =>{
  const id = req.params;
  const account = await Account.findById({_id: mongoose.Types.ObjectId(id)}, function(err, result){
    if(err){
      console.log(err);
    } else {
      result.state = "validated"
      result.save();
    }
  }).clone()
  return res.redirect('/validated')
})

router.get('/lock/:id', isLoggin, async (req, res, next) =>{
  const id = req.params;
  const account = await Account.findById({_id: mongoose.Types.ObjectId(id)}, function(err, result){
    if(err){
      console.log(err);
    } else {
      result.state = "locked"
      result.save();
    }
  }).clone()
  return res.redirect('/locked')
})

router.get('/reup/:id', async (req, res, next) =>{
/*   const id = req.params;
  const account = await Account.findById({_id: mongoose.Types.ObjectId(id)}, function(err, result){
    if(err){
      console.log(err);
    } else {
      result.state = "validated"
      result.save();
    }
  }).clone() */
  return res.redirect('/')
})

router.get('/unlock/:id', isLoggin, async (req, res, next) =>{
  const id = req.params;
  const account = await Account.findById({_id: mongoose.Types.ObjectId(id)}, function(err, result){
    if(err){
      console.log(err);
    } else {
      result.state = "validated"
      result.save();
    }
  }).clone()
  return res.redirect('/validated')
})

router.get('/:id', isLoggin, async (req, res, next) =>{
  const accountId = req.params;
  const account = await Account.findById(mongoose.Types.ObjectId(accountId))
  const user = await User.findOne({accounts: mongoose.Types.ObjectId(accountId)})
  res.render('userProfile', {user, account})
})


// router.use((err, req, res, next) =>{
//   const {statusCode = 500} = err;
//   if(!err.message) err.message = 'Oh no no, something went wrong';
//   res.status(statusCode).render('error', {err});
// })

module.exports = router;
