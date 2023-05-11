const { number } = require('joi');
const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose')

const accountSchema = new Schema({
    username: {
        type: String,
        require: true,
        unique: true
    },

    password: {
        type: String,
        require: true
    },

    state: {
        type: String,
        enum: ['validated', 'notValidated', 'locked', 'disabled']
    },

    failureTime: Number,
    
    date: {
        type: Date,
        default: Date.now()
    },
    role: {
        type: String,
        default: "USER"
    },

    withdrawalTime: {
        type: Number,
        default: 0
    },

    history: [{
        transactionType: {
            type: String,
            enum: ['creditCard', 'mobileCard', 'withdrawal', 'null'],
            default: 'null'
        },
        money: {
            type: Number,
        },
        transactionTime: Date,
        state: {
            type: String,
            enum: ['done', 'waiting', 'canceled', 'null'],
        },
        cardNumber: Number,
        messages: {
            type: String,
            default: "null"
        }
    }]
})

//accountSchema.plugin(passportLocalMongoose)
module.exports = mongoose.model('Account', accountSchema);