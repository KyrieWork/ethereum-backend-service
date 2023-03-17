const ethers = require('ethers')
const { currentChainId } = require('../../config')
const { RPC_LIST } = require('../../constants')

const fromEth = (value) => {
  return ethers.utils.formatEther(String(value))
}

const toEth = (value) => {
  return ethers.utils.parseEther(String(value))
}

const getProvider = () => {
  return new ethers.providers.JsonRpcProvider(RPC_LIST[currentChainId()][0])
}

const getEthBalance = async (account) => {
  const provider = getProvider()
  const res = await provider.getBalance(account)
  return fromEth(res)
}

module.exports = {
  getProvider,
  getEthBalance,
}
