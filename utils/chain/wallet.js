const { ethers, utils } = require('ethers')
const { currentChainId } = require('../../config')
const { newProvider, fromEth, toEth } = require('./common')

// 获取 ETH 余额
const getEthBalance = async (account) => {
  const provider = newProvider()
  const res = await provider.getBalance(account)
  return fromEth(res)
}

// 使用 私钥 发送 ETH
const sendEthFromPrivateKey = async (privateKey, to, amount) => {
  const provider = newProvider()
  const wallet = new ethers.Wallet(privateKey)
  const activeWallet = wallet.connect(provider)
  const nonce = await activeWallet.getTransactionCount('pending')
  const txParams = {
    nonce: nonce,
    to: to,
    value: toEth(amount),
    chainId: currentChainId(),
  }
  // const estimateGas = await activeWallet.estimateGas(txParams)
  const tx = await activeWallet.sendTransaction({
    ...txParams,
    // gasLimit: estimateGas,
  })
  const txRes = await tx.wait()
  return txRes
}

// 创建助记词
const createMnemonic = () => {
  const mnemonic = utils.entropyToMnemonic(utils.randomBytes(16))
  return mnemonic
}

// 导入助记词获取私钥公钥
const importMnemonic = (mnemonic, hdIndex = 0) => {
  const hdNode = utils.HDNode.fromMnemonic(mnemonic)
  let basePath = "m/44'/60'/0'/0"
  let hdNodeNew = hdNode.derivePath(basePath + '/' + hdIndex)
  return hdNodeNew
}

module.exports = {
  getEthBalance,
  createMnemonic,
  importMnemonic,
  sendEthFromPrivateKey,
}
