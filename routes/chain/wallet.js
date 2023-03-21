const route = require('koa-router')()
const controller = require('../../controller/chain/WalletController')

// 查询 ETH 余额
route.get('/ethBalance', controller.ethBalance)
// 发送 ETH
route.post('/sendEth', controller.sendEth)

module.exports = route
