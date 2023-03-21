const { token } = require('../../utils/chain')

class TokenController {
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
  // 使用私钥发送 Token
  async transfer(ctx) {
    try {
      const req = ctx.request.body
      const res = await token.sendTokenFromPrivateKey({
        token: req.token,
        privateKey: req.privateKey,
        to: req.to,
        amount: req.amount,
      })
      ctx.customJson({
        transactionHash: res.transactionHash,
        blockNumber: res.blockNumber,
      })
    } catch (e) {
      ctx.error(e, { message: '解析失败.' })
    }
  }
  async transferFrom(ctx) {
    try {
      const req = ctx.request.body
      const res = await token.sendTokenFromPrivateKey({
        token: req.token,
        privateKey: req.privateKey,
        from: req.from,
        to: req.to,
        amount: req.amount,
      })
      ctx.customJson({
        transactionHash: res.transactionHash,
        blockNumber: res.blockNumber,
      })
    } catch (e) {
      ctx.error(e, { message: '解析失败.' })
    }
  }
}

module.exports = new TokenController()
