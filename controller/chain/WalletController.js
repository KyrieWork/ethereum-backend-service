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
  // 使用私钥发送 ETH
  async sendEth(ctx) {
    try {
      const req = ctx.request.body
      const res = await wallet.sendEthFromPrivateKey(req.privateKey, req.to, req.amount)
      ctx.customJson({
        transactionHash: res.transactionHash,
        blockNumber: res.blockNumber,
      })
    } catch (e) {
      ctx.error(e, { message: '解析失败.' })
    }
  }
}

module.exports = new WalletController()
