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
  const provider = newProvider()
  const interface = new ethers.Contract(to, abi).interface
  const data = interface.encodeFunctionData(funcName, arg)
  const tx = await provider.call({
    to: to,
    data: data,
  })
  return tx
}

module.exports = {
  newProvider,
  fromEth,
  toEth,
  RPC_URL,
  callContract,
}
