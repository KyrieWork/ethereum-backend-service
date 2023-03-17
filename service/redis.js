const config = require('../config');
const { createClient } = require('redis');
const redisConfig = config.get('redis');

const Log = require('./log');
const log = new Log('redis');

const clients = {};
class Redis {
  constructor(name = 'auth', options) {
    if (!clients[name]) {
      const client = createClient({
        ...redisConfig.base,
        ...redisConfig[name],
        ...options,
        retry_strategy(options) {
          if (options?.error?.code === 'ECONNREFUSED') {
            log.error('连接被拒绝');
          }
          if (options.times_connected > 10) {
            log.error('重试连接超过十次');
          }
          return Math.max(options.attempt * 100, 1000);
        },
      });
      client.on('error', (err) => {
        log.error(err);
      });
      clients[name] = client;
    }
    this.client = clients[name];
  }

  async get(name) {
    return new Promise((solve) => {
      this.client.get(name, (err, reply) => {
        solve(reply);
      });
    });
  }

  async set(...args) {
    new Promise((solve) => {
      this.client.set(args, (err, res) => {
        solve(res);
      });
    });
  }

  async expire(...args) {
    return await this.client.expire(...args);
  }

  async hmset(key, obj) {
    new Promise((solve) => {
      this.client.hmset(key, obj, (err, res) => {
        solve(res);
      });
    });
  }

  async hgetall(key) {
    return new Promise((solve) => {
      this.client.hgetall(key, (err, reply) => {
        solve(reply);
      });
    });
  }

  destroy(key) {
    return this.client.del(String(key));
  }

  async exists(key) {
    return new Promise((solve) => {
      this.client.exists(key, (err, reply) => {
        solve(reply);
      });
    });
  }

  async sadd(...args) {
    new Promise((solve) => {
      this.client.sadd(args, (err, res) => {
        solve(res);
      });
    });
  }

  async sismember(...args) {
    return new Promise((solve) => {
      this.client.sismember(args, (err, reply) => {
        solve(reply);
      });
    });
  }
  async smembers(key) {
    return new Promise((solve) => {
      this.client.smembers(key, (err, reply) => {
        solve(reply);
      });
    });
  }
}

module.exports = Redis;
