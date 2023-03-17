const knex = require('knex');
const config = require('../config');
const dbConfig = config.get('dbConfig');
const baseConfig = config.get('base');
const { debug } = baseConfig;

let writer = null;
let reader = null;
function getDb(readonly = false) {
  if (readonly) {
    if (!reader) {
      const { host, port, database } = dbConfig;
      const { username, password } = dbConfig?.reader || {};
      reader = knex({
        client: 'mysql',
        connection: {
          host,
          port,
          user: username,
          password,
          database,
          dateStrings: true,
        },
        afterCreate: (connection, callback) => {
          connection.query(`SET time_zone = ${dbConfig.timezone};`, (err) => {
            callback(err, connection);
          });
        },
        debug: true,
        log: {
          debug(message) {
            debug && console.log(message.sql, message.bindings);
          },
        },
      });
    }
    return reader;
  }
  if (!writer) {
    const { username, password, host, port, database } = dbConfig;
    writer = knex({
      client: 'mysql',
      connection: {
        host,
        port,
        user: username,
        password,
        database,
        dateStrings: true,
      },
      afterCreate: (connection, callback) => {
        connection.query(`SET time_zone = ${dbConfig.};`, (err) => {
          callback(err, connection);
        });
      },
      debug: true,
      log: {
        debug(message) {
          debug && console.log(message.sql, message.bindings);
        },
      },
    });
  }
  return writer;
}

module.exports = {
  getDb,
};
