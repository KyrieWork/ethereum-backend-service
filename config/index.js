const { SUPPORT_CHAINS } = require('../constants')

const currentChainId = () => {
  return SUPPORT_CHAINS.bsc_test
}

async function init() {
  let appConfig = {}
  global.appConfig = appConfig
}

function getValue(key) {
  return global?.appConfig?.[key] || {}
}

module.exports = {
  init,
  get: getValue,
  currentChainId,
}
