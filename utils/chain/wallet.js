const { ethers, utils } = require('ethers')
const { newProvider, fromEth } = require('./common')

// 获取 ETH 余额
const getEthBalance = async (account) => {
  const provider = newProvider()
  const res = await provider.getBalance(account)
  return fromEth(res)
}

// 创建助记词
const createMnemonic = () => {
  const mnemonic = utils.entropyToMnemonic(utils.randomBytes(16))
  return mnemonic
}

// 导入助记词获取私钥公钥
const importMnemonic = (mnemonic) => {
  const hdNode = utils.HDNode.fromMnemonic(mnemonic)
  let basePath = "m/44'/60'/0'/0";
  let hdNodeNew = hdNode.derivePath(basePath + "/" + 0);
  return hdNodeNew
}

module.exports = {
  getEthBalance,
  createMnemonic,
  importMnemonic,
}
