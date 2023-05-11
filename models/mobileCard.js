const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const mobileCardSchema = new Schema({
    name: String,
    number: Number
})

module.exports = mongoose.model('MobileCard', mobileCardSchema)