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
}
