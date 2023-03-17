const { API_PREFIX } = require('../const');

const config = require('../config');

const Log = require('../service/log');
// 使用 authLog 记录请求日志
const authLog = new Log('auth');

module.exports = async (ctx, next) => {

  const headers = ctx.request.header;
  // 在此判断IP地址
  // if () {
  //   return ctx.throw(400, { code: -1, message: '非法请求' });
  // }

  await next();
};
