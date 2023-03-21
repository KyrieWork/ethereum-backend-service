const route = require('koa-router')()
const controller = require('../../controller/offchain/WalletController')

// 创建助记词
route.post('/createMnemonic', controller.createMnemonic)
// 导入助记词
route.post('/importMnemonic', controller.importMnemonic)

module.exports = route
