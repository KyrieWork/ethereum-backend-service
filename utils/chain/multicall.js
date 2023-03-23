require('dotenv').config()
const { currentChainId } = require('../../config')
const { IMulticall, IERC20 } = require('../../constants/abi')
const { ADDRESS_LIST_MULTICALL, ADDRESS_LIST_TOKEN } = require('../../constants')
const { ethers, utils, providers, Contract, Wallet } = require('ethers')
const { newProvider, fromEth, toEth } = require('./common')

const env = process.env
const chainId = currentChainId()

const executeMulticall = async (callRequests) => {
  try {
    const multicallAddress = ADDRESS_LIST_MULTICALL[chainId]
    const ownerWallet = new Wallet(env.PRIVATE_KEY).connect(newProvider())
    const multicall = new Contract(multicallAddress, IMulticall, ownerWallet)
    const response = await multicall.aggregate(callRequests)
    const formatRes = multicall.interface.decodeFunctionResult('aggregate', response.data)
    return formatRes
  } catch (error) {
    console.error('executeMulticall', error)
  }
}

const contractCall = async ({ abi, to, calls }) => {
  try {
    const interface = new ethers.Contract(to, abi).interface
    const callRequests = calls.map((call) => {
      const callData = interface.encodeFunctionData(call.funcName, call.arg)
      return {
        target: to,
        callData,
      }
    })
    const res = await executeMulticall(callRequests)

    return res
  } catch (error) {
    console.error('contractCall', error)
  }
}

const multicallUSDT = async () => {
  const args = [
    '0xE854c322c90af134E1943aa44435bcdeF1955282',
    '0x71c8A0b38B29371C3Bd9B13468d8F6B7bdCf1a7d',
    '0xE854c322c90af134E1943aa44435bcdeF1955282',
    '0x71c8A0b38B29371C3Bd9B13468d8F6B7bdCf1a7d',
    '0xE854c322c90af134E1943aa44435bcdeF1955282',
    '0x71c8A0b38B29371C3Bd9B13468d8F6B7bdCf1a7d',
    '0xE854c322c90af134E1943aa44435bcdeF1955282',
    '0x71c8A0b38B29371C3Bd9B13468d8F6B7bdCf1a7d',
  ]
  try {
    const calls = args.map((arg) => {
      return {
        funcName: 'balanceOf',
        arg: [arg],
      }
    })
    const res = await contractCall({
      abi: IERC20,
      to: ADDRESS_LIST_TOKEN[chainId]['usdt'],
      calls: calls,
    })
    return res
  } catch (error) {
    console.error('multicallUSDT', error)
  }
}

module.exports = { multicallUSDT }
