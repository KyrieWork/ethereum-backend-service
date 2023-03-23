const ABI = require('./abi')
const SUPPORT_CHAINS = require('./supportChains')
const ADDRESS_LIST_TOKEN = require('./tokenList')
const ADDRESS_LIST_CONTRACT = require('./contractList')
const ADDRESS_LIST_MULTICALL = require('./multicallList')
const RPC_LIST = require('./rpcList')

// 接口前缀
const API_PREFIX = '/eth'

module.exports = {
  API_PREFIX,
  SUPPORT_CHAINS,
  ADDRESS_LIST_TOKEN,
  ADDRESS_LIST_CONTRACT,
  ADDRESS_LIST_MULTICALL,
  ABI,
  RPC_LIST,
}
