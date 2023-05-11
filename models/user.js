const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const Account = require('../models/account')


const userSchema = new Schema({
    name: String,
    email: {
        type: String,
        required: [true, 'Email is requried'],
        unique: true
    },
    balance: {
        type: Number,
        min: [0, 'Money must greater than 0'],
        default: 0
    },
    phoneNumber: String,
    birthday: String,
    address: String,
    images: [
        {
            url: String,
            filename: String
        }
    ],

/*     backImages: [
        {
            url: String,
            fileName: String
        }
    ], */

    accounts: [{type: Schema.Types.ObjectId, ref: 'Account'}]
});

userSchema.pre('save', async function() {
    
    console.log('saved to mongodb');
})

module.exports = mongoose.model('User', userSchema);