const { ethers, utils, providers } = require('ethers')
const { currentChainId } = require('../../config')
const { RPC_LIST } = require('../../constants')

const RPC_URL = RPC_LIST[currentChainId()][0]

const fromEth = (value) => {
  return utils.formatEther(String(value))
}

const toEth = (value) => {
  return utils.parseEther(String(value))
}

const newProvider = () => {
  return new providers.JsonRpcProvider(RPC_URL)
}

const callContract = async (abi, to, funcName, arg = []) => {
  try {
    const provider = newProvider()
    const interface = new ethers.Contract(to, abi).interface
    const data = interface.encodeFunctionData(funcName, arg)
    const tx = await provider.call({
      to: to,
      data: data,
    })
    return tx
  } catch (error) {
    console.log('error', error)
  }
}

const sendContract = async (abi, privateKey, to, funcName, arg = [], eth = 0) => {
  try {
    const provider = newProvider()
    const wallet = new ethers.Wallet(privateKey)
    const activeWallet = wallet.connect(provider)

    const interface = new ethers.Contract(to, abi).interface
    const data = interface.encodeFunctionData(funcName, arg)

    const txParams = {
      to: to,
      from: activeWallet.address,
      data: data,
      value: eth,
      chainId: currentChainId(),
    }
    const estimateGas = await activeWallet.estimateGas(txParams)
    const tx = await activeWallet.sendTransaction({
      ...txParams,
      gasLimit: estimateGas,
    })
    const txRes = await tx.wait()
    return txRes
  } catch (error) {
    console.log('error', error)
  }
}

module.exports = {
  newProvider,
  fromEth,
  toEth,
  RPC_URL,
  callContract,
  sendContract,
}
