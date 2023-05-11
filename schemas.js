const Joi = require('joi')
  
module.exports.changePassFirstSchemas = Joi.object({
    firstPassword: Joi.string().required(),
    secondPassword: Joi.string().required()
}).required()

module.exports.registerSchemas = Joi.object({
    email: Joi.string().email()
})