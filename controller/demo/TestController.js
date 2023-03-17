class TestController {
  // 解析excel
  async testAction(ctx) {
    try {
      console.log('111')
      const data = {}
      ctx.customJson(data)
    } catch (e) {
      ctx.error(e, { message: '解析失败.' })
    }
  }
}

module.exports = new TestController()
