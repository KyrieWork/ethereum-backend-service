const route = require('koa-router')()
const controller = require('../../controller/offchain/WalletController')

route.post('/createMnemonic', controller.createMnemonic)
route.post('/importMnemonic', controller.importMnemonic)

module.exports = route
