const route = require('koa-router')()
const controller = require('../../controller/chain/TokenController')

route.post('/transfer', controller.transfer)
route.post('/transferFrom', controller.transferFrom)

module.exports = route
