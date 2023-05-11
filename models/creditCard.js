const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const creditCardSchema = new Schema({
    number: Number,
    expireDate: String,
    cvv: Number,
    money: Number
})

module.exports = mongoose.model('CreditCard', creditCardSchema)
// const card = new CreditCard({    
//     number: 111111,
//     expireDate: "2022-10-10",
//     cvv: 411,
//     money: 1000000000});
// card.insertMany(
//     {
//     number: 111111,
//     expireDate: "2022-10-10",
//     cvv: 411,
//     money: 1000000000
//     },
//     {
//         number: 222222,
//         expireDate: "2022-11-11",
//         cvv: 443,
//         money: 1000000000
//     },
//     {
//         number: 333333,
//         expireDate: "2022-12-12",
//         cvv: 577,
//         money: 1000000000
//     }

// )