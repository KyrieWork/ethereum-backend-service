const Koa = require('koa');
// const fs = require('fs');
const session = require('koa-session');
const config = require('./config');
const xRequestId = require('koa-x-request-id');
const koaBody = require('koa-body');

async function startWebServer() {
  const router = require('./routes');
  const auth = require('./middleware/auth');
  const reponseHelper = require('./middleware/reponseHelper');
  const Log = require('./service/log');
  const log = new Log('app');
  const requestLog = new Log('request', { splitByHour: true });

  const Redis = require('./service/redisStore');

  const app = new Koa();

  app.use(xRequestId({ inject: true }, app));

  /**
   * 错误处理
   */
  app.use(async (ctx, next) => {
    const timestamp = Date.now();
    try {
      await next();
    } catch (e) {
      log.ctxError(ctx, e);
      ctx.status = e.status || 500;
      ctx.body = {
        code: -1,
        message: e.message || 'Internal Server Error',
      };
    }
    // 记录接口耗时
    log.info(`${ctx.id}|${ctx.method}|${ctx.originalUrl}|${Date.now() - timestamp} `);
    // 记录请求的内容
    const { userId = '' } = ctx.session?.user || {};
    requestLog.info({
      userId,
      requestId: ctx.id,
      method: ctx.method,
      url: ctx.originalUrl,
      headers: ctx.request.headers,
      params: ctx.request?.params,
      query: ctx.request?.query,
      body: ctx.request?.body,
    });
  });
  // 允许代理
  app.proxy = true;

  /**
   * 登录
   */
  const { sessionKey } = config.get('auth');
  app.keys = ['gwyj-platform'];
  app.use(session({
    key: sessionKey,
    maxAge: 60 * 60 * 1000,
    httpOnly: true,
    store: new Redis(),
  }, app));

  app.use(koaBody({
    multipart: true,
    formidable: {
      maxFileSize: 10 * 1024 * 1024,    // 设置上传文件大小最大限制，默认2M
    },
  }));

  app.use(reponseHelper);
  app.use(auth);

  /**
   * 加路由
   */
  app.use(router.http.routes());

  const port = process.env.PORT || 13699;
  const server = app.listen(port, () => {
    console.log(`启动成功 port: ${port}`);
  });

  // socket
  const io = require('socket.io')({
    transports: ['websocket'],
    cors: {
      credentials: true,
    },
  });
  router.socket.forEach((item) => {
    io.of(item.path).on('connection', socket => item.socket.connection(socket, io));
  });

  io.attach(server);

  // 写在全局，以便http触发socket回调
  global.socketServer = io;
}

config.init().then(startWebServer())

