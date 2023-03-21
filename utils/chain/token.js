const { IERC20 } = require('../../constants/abi')
const { toEth, fromEth, callContract, sendContract } = require('./common')

const getTokenBalance = async (token, account) => {
  return fromEth(await callContract(IERC20, token, 'balanceOf', [account]))
}

// 获取 Token 总量
const getTokenTotal = async (token) => {
  return fromEth(await callContract(IERC20, token, 'totalSupply', []))
}

// 使用 私钥 发送 Token
const sendTokenFromPrivateKey = async ({ token, privateKey, from, to, amount }) => {
  const funcName = from ? 'transferFrom' : 'transfer'
  const arg = from ? [from, to, toEth(amount)] : [to, toEth(amount)]
  const res = await sendContract(IERC20, privateKey, token, funcName, arg)
  return res
}

module.exports = {
  getTokenBalance,
  getTokenTotal,
  sendTokenFromPrivateKey,
}
