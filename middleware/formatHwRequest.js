const { fields: hwFields } = require('../const/hw')

class FormatHwRequest {
  // 把内部字段替换为华为字段
  replaceKeys(functionName, data) {
    if (hwFields[functionName]) {
      const resKeys = hwFields[functionName].map((i) => i[1])
      const params = {}
      if (Object.keys(data).length > 0) {
        Object.keys(data).forEach((key) => {
          const resKeyIndex = resKeys.findIndex((i) => i === key)
          if (resKeyIndex > -1) {
            params[hwFields[functionName][resKeyIndex][0]] = data[key]
          } else {
            params[key] = data[key]
          }
        })
      }
      return params
    }
    return data
  }

  // 省
  async getSJQHBCX(body) {
    return this.replaceKeys('getSJQHBCX', body)
  }

  // 市
  async getGETCJQHBCX(body) {
    return this.replaceKeys('getGETCJQHBCX', body)
  }

  // 区
  async getQJQHBCX(body) {
    return this.replaceKeys('getQJQHBCX', body)
  }

  // 街道
  async getJDJQHBCX(body) {
    return this.replaceKeys('getJDJQHBCX', body)
  }

  // 社区
  async getSQQHBCX(body) {
    return this.replaceKeys('getSQQHBCX', body)
  }

  // 网格
  async getWGDCX(body) {
    return this.replaceKeys('getWGDCX', body)
  }
}

module.exports = FormatHwRequest
