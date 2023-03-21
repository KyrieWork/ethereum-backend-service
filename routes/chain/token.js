const route = require('koa-router')()
const controller = require('../../controller/chain/TokenController')

// 转账 Token transfer
route.post('/transfer', controller.transfer)
// 转账 Token transferFrom
route.post('/transferFrom', controller.transferFrom)
// 查询 Token 余额
route.get('/tokenBalance', controller.tokenBalance)

module.exports = route
