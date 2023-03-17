const { wallet, token } = require('../../utils/chain')

class WalletController {
  // 获取 ETH 余额
  async ethBalance(ctx) {
    try {
      const req = ctx.query
      const balance = await wallet.getEthBalance(req.account)
      ctx.customJson({
        balance: balance,
      })
    } catch (e) {
      ctx.error(e, { message: '解析失败.' })
    }
  }
  // 获取 Token 余额
  async tokenBalance(ctx) {
    try {
      const req = ctx.query
      const balance = await token.getTokenBalance(req.token, req.account)
      ctx.customJson({
        balance: balance,
      })
    } catch (e) {
      ctx.error(e, { message: '解析失败.' })
    }
  }
}

module.exports = new WalletController()