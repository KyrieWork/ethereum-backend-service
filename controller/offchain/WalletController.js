const { wallet } = require('../../utils/chain')

class WalletController {
  // 创建助记词
  async createMnemonic(ctx) {
    try {
      const res = wallet.createMnemonic()
      ctx.customJson({
        mnemonic: res,
      })
    } catch (e) {
      ctx.error(e, { message: '解析失败.' })
    }
  }
  // 助记词获取私钥公钥
  async importMnemonic(ctx) {
    try {
      const req = ctx.request.body
      const res = wallet.importMnemonic(req.mnemonic)
      ctx.customJson({
        address: res.address,
        privateKey: res.privateKey,
      })
    } catch (e) {
      ctx.error(e, { message: '解析失败.' })
    }
  }
}

module.exports = new WalletController()
