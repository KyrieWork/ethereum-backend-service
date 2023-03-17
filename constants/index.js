const ABI = require('./abi')
const SUPPORT_CHAINS = require('./supportChains')
const ADDRESS_LIST_TOKEN = require('./tokenList')
const ADDRESS_LIST_CONTRACT = require('./contractList')
const RPC_LIST = require('./rpcList')

// 接口前缀
const API_PREFIX = '/eth'

module.exports = {
  API_PREFIX,
  ADDRESS_LIST_TOKEN,
  SUPPORT_CHAINS,
  ADDRESS_LIST_CONTRACT,
  ABI,
  RPC_LIST,
}
