
const { fields: hwFields } = require('../const/hw');

class FormatHwResponse {
  // 把华为字段替换为内部字段
  replaceKeys(functionName, params) {
    const data = { ...params };
    if (hwFields[functionName] && data?.result?.data) {
      const resKeys = hwFields[functionName].map(i => i[0]);
      data.result.data = data?.result?.data
        ?.map((item) => {
          const obj = {};
          Object.keys(item).forEach((key) => {
            const resKeyIndex = resKeys.findIndex(i => i === key);
            if (resKeyIndex > -1) {
              obj[hwFields[functionName][resKeyIndex][1]] = item[key];
            } else {
              obj[key] = item[key];
            }
          });
          return obj;
        });
    }
    return data;
  }

  // 省
  async getSJQHBCX(res) {
    return this.replaceKeys('getSJQHBCX', res);
  }

  // 市
  async getGETCJQHBCX(res) {
    return this.replaceKeys('getGETCJQHBCX', res);
  }

  // 区
  async getQJQHBCX(res) {
    return this.replaceKeys('getQJQHBCX', res);
  }

  // 街道
  async getJDJQHBCX(res) {
    return this.replaceKeys('getJDJQHBCX', res);
  }

  // 社区
  async getSQQHBCX(res) {
    return this.replaceKeys('getSQQHBCX', res);
  }

  // 网格
  async getWGDCX(res) {
    return this.replaceKeys('getWGDCX', res);
  }
}

module.exports = FormatHwResponse;
