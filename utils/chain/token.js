const { ethers, utils } = require('ethers')
const { IERC20 } = require('../../constants/abi')
const { newProvider, fromEth, callContract } = require('./common')

const getTokenBalance = async (token, account) => {
  return fromEth(await callContract(IERC20, token, 'balanceOf', [account]))
}

module.exports = {
  getTokenBalance,
}
