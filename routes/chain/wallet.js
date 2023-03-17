const route = require('koa-router')()
const controller = require('../../controller/chain/WalletController')

route.get('/ethBalance', controller.ethBalance)
route.get('/tokenBalance', controller.tokenBalance)

module.exports = route
