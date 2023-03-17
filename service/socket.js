const Redis = require('./redis')
const redis = new Redis('socket')
const config = require('../config')
const socketConfig = config.get('socket')
const { namespace: allNamespace } = socketConfig

const Log = require('./log')
const log = new Log('socket')
class Socket {
  constructor(namespace = '') {
    this.namespace = namespace
  }

  get io() {
    const { socketServer } = global
    const { namespace } = this
    if (namespace) {
      return socketServer.of(namespace)
    }
    return socketServer
  }

  emit(key, message) {
    this.io.emit(key, message)
  }

  /**
   * userIds 群发
   * @param userIds
   * @param key
   * @param message
   * @returns {Promise<{code: number, message: string}>}
   */
  async userIdMassEmit(userIds, { key = 'change', message = 'ok' } = {}) {
    // 获取当前namespace 连接
    const [sockets] = this.io.sockets
    if (sockets?.length > 0) {
      // 处理没用得sockets
      const clients = sockets
        ?.map((c) => {
          if (typeof c === 'object') {
            return c
          }
          return ''
        })
        .filter((i) => !!i)
      // 连接redis 查询存在得userId 对应得连接
      // 暂时只支持namespace
      if (this.namespace && clients?.length > 0) {
        const list = await redis.hgetall(this.namespace)
        const socketIds = userIds.map((i) => list[i])
        const array = []
        clients.forEach((client) => {
          socketIds.forEach((id) => {
            if (client.id === id) {
              array.push(client)
            }
          })
        })
        if (array) {
          this.massEmit(message, { key, array })
        }
        return { code: 0, message: 'ok' }
      }
    }
    return { code: 0, message: 'There is currently no connection' }
  }

  /**
   * 群发socket消息
   * @param message
   * @param key
   * @param array
   */
  massEmit(message, { key = 'change', array = [] }) {
    if (array) {
      array.forEach((client) => {
        client.emit(key, message)
      })
    } else {
      this.io.emit(key, message)
    }
  }

  // 断开
  async primarydisconnect(client, { status, message }) {
    if (!client) {
      return
    }
    return new Promise((solve) => {
      client.emit('message', 'token expired')
      if (status && message) {
        client.emit('auth', { status, message })
      }
      client.disconnect(true)
      solve()
    })
  }

  /**
   * 查出用户所有socket连接，然后断开，然后清空redis
   * @param {*} { userId, source }
   * @returns
   */
  async disconnectUserId({ userId, source }, { status, message }) {
    try {
      const routes = Object.values(allNamespace)
      // 用户连接的所有socket
      const hgetalls = routes.map((i) => redis.hgetall(`${i}@${source}`))
      const cacheSockets = (await Promise.all(hgetalls))
        ?.filter((i) => i && i[userId])
        .map((i) => {
          try {
            return JSON.parse(i[userId])
          } catch (e) {
            return []
          }
        })
      const clients = []
      routes.forEach((r) => {
        const { sockets: socketsMap } = this.io.of(r)
        Array.from(socketsMap).forEach((item) => {
          const [id, client] = item
          if (cacheSockets?.flat(Infinity)?.includes(id)) {
            clients.push(client)
          }
        })
      })
      // 推送通知
      await Promise.all(clients.map((i) => this.primarydisconnect(i, { status, message })))
      // 清缓存
      const multi = redis.client.multi()
      // 只删除当前节点的活跃client
      /* const validSocketIds = clients.map(i => i.id);
      await Promise.all(routes.map((i, index) => multi.hmset(`${i}@${source}`,
          { [userId]: JSON.stringify(cacheSockets[index]?.filter(id => !validSocketIds.includes(id))) }
        ))
      ); */
      // 清空，直接删除key
      await Promise.all(routes.map((i) => multi.hdel(`${i}@${source}`, userId)))
      multi.exec()
    } catch (e) {
      log.error(e)
      return false
    }
    return true
  }
}

module.exports = Socket
