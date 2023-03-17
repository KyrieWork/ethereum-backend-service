const _ = require('underscore');
const Log = require('../service/log');
const log = new Log('responseHelper');

module.exports = async (ctx, next) => {
  ctx.customJson = (body, options = {}) => {
    let data = {
      code: 0,
      message: 'success',
      data: body,
      requestId: ctx.id,
    };
    if (options.message || options.error || options.code) {
      data = _.extend(data, _.pick(options, 'code', 'message', 'error'));
    }
    ctx.body = JSON.stringify(data);
  };
  ctx.error = (error, options = {}) => {
    let message = error?.message;
    if (!message || (!/[\u4e00-\u9fa5]{4}/.test(message) && !message.startsWith('ValidationError:'))) {
      message = options?.message || error?.message || error?.msg || error || 'internal error';
    }
    let data = {
      code: -1,
      message: message.replace('ValidationError: ', ''),
      requestId: ctx.id,
    };
    if (options.code || options.message) {
      data = _.extend(data, _.pick(options, 'code', 'message'));
    }
    log.ctxError(ctx, error);
    ctx.body = JSON.stringify(data);
  };
  await next();
};
