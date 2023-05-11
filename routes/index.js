var express = require('express');
var router = express.Router();
const Account = require('../models/account')
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/user')

const isLoggin = (req, res, next) =>{
  if(!req.session.userId){
    return res.redirect('/users/login')
  }
  next();
}

const isAdmin = async (req, res, next) => {
  //console.log(req.session.userId);
  const account = await Account.findById({_id: mongoose.Types.ObjectId(req.session.userId)}, function(err, result){
    if (err) {
      console.log(err);
    }
    if(result.role == 'ADMIN'){
      next();
    }
    else {
      return res.redirect('/users')
    }
    //console.log(result);
  }).clone()
}


router.get('/', isLoggin, catchAsync(isAdmin), async function(req, res, next) {
  const accounts = await Account.find({}).sort('-date')
  res.render('mainLayout', {accounts});
});

router.get('/validated', isLoggin, catchAsync(isAdmin), async function(req, res, next) {
  ///const accounts = await Account.find();
  const accounts = await Account.find({state: "validated"}).sort('-date')
  res.render('mainLayout', {accounts});
});

router.get('/notValidated', isLoggin, catchAsync(isAdmin), async function(req, res, next) {
  const accounts = await Account.find({state: "notValidated"})
  res.render('mainLayout', {accounts});
});

router.get('/disabled', isLoggin, catchAsync(isAdmin), async function(req, res, next) {
  const accounts = await Account.find({state: "disabled"}).sort('-date')
  res.render('mainLayout', {accounts});
});

router.get('/locked', isLoggin, catchAsync(isAdmin), async function(req, res, next) {
  const accounts = await Account.find({state: "locked"}).sort('-date')
  res.render('mainLayout', {accounts});
});

router.get('/history', isLoggin, catchAsync(isAdmin), async function(req, res, next) {
  const accounts = await Account.find({}).clone()
  res.render('history', {accounts})
})

router.get('/historyDetail/:id', isLoggin, catchAsync(isAdmin), async function(req, res, next) {
  console.log(req.params);
  const id = req.params;
  const acc = await Account.findById({_id: mongoose.Types.ObjectId(id)}, function(err, account) {
    if(err){
      console.log(err);
    }
    res.render('historyDetail', {account})
  }).clone()
  
})

router.get('/accept/:historyId/:accountId', isLoggin, catchAsync(isAdmin), async function(req, res, next) {
  const historyId = req.params.historyId;
  const accountId = req.params.accountId;
  const user = await User.findOne({accounts: mongoose.Types.ObjectId(accountId)}).clone()
  const account = await Account.findById({_id: mongoose.Types.ObjectId(accountId)}).clone()

  account.history.forEach(async element => {
    if(element._id == historyId){
      //console.log("found it");
      user.balance = user.balance - element.money;
      //console.log(user.balance - element.money);
      element.state = "done"
      await user.save();
      await account.save()
    }
  });
  res.redirect('/history')
})

router.get('/decline/:historyId/:accountId', isLoggin, catchAsync(isAdmin), async function(req, res, next) {
  const historyId = req.params.historyId;
  const accountId = req.params.accountId;
  const user = await User.findOne({accounts: mongoose.Types.ObjectId(accountId)}).clone()
  const account = await Account.findById({_id: mongoose.Types.ObjectId(accountId)}).clone()

  account.history.forEach(async element => {
    if(element._id == historyId){
      element.state = "canceled"
      await account.save()
    }
  });
  res.redirect('/history')
})

module.exports = router;
