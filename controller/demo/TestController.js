const { currentChainId } = require('../../config')
const { ADDRESS_LIST_TOKEN } = require('../../constants')
const { wallet } = require('../../utils/chain')
class TestController {
  // 解析excel
  async testAction(ctx) {
    try {
      const res = await wallet.getEthBalance('0xE854c322c90af134E1943aa44435bcdeF1955282')
      console.log('res', res)
      const data = {
        balance: res,
      }
      ctx.customJson(data)
    } catch (e) {
      ctx.error(e, { message: '解析失败.' })
    }
  }
}

module.exports = new TestController()
