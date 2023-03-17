const config = require('../config')
const { expiredTime } = config.get('auth')
const Redis = require('./redis')

// session store
class RedisStore extends Redis {
  constructor() {
    super('session')
  }

  // 每次请求过来就给session续期
  async get(key) {
    return new Promise((solve) => {
      this.client.get(key, async (err, reply) => {
        if (reply) {
          await this.expire(key, expiredTime)
        }
        solve((reply && JSON.parse(reply)) || '')
      })
    })
  }

  // 设置session并续期
  async set(key, session) {
    const { user } = session
    if (!user) {
      return this.client.del(key)
    }
    new Promise((solve) => {
      this.client.multi().set(key, JSON.stringify(session)).expire(key, expiredTime).exec()
      solve()
    })
  }

  async expire(...args) {
    return this.client.expire(args)
  }

  destroy(key) {
    return this.client.del(key)
  }
}

module.exports = RedisStore
