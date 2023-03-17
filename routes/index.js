const glob = require('glob')
const Router = require('koa-router')
const HttpRouter = new Router()
const { API_PREFIX } = require('../constants')

// 一个系统一个目录，加载目录下所有的路由
/**
 * demo: demo

 */
const routes = ['demo']

routes.forEach((item) => {
  const files = glob.sync(`./routes/${item}/*.js`)
  files.forEach((file) => {
    const filaName = file.replace(`./routes/${item}/`, '').replace('.js', '')
    HttpRouter.use(`${API_PREFIX}/${item}/${filaName}`, require(file.replace('/routes', '')).routes())
  })
})

HttpRouter.use(`${API_PREFIX}`, require('./login').routes())

// socket
const socketRouter = []
const socketFiles = glob.sync('./routes/socket/*.js')
socketFiles.forEach((file) => {
  const filaName = file.replace('./routes/socket/', '').replace('.js', '')
  socketRouter.push({
    path: `/${filaName}`,
    socket: require(file.replace('/routes', '')),
  })
})

const route = {
  http: HttpRouter,
  socket: socketRouter,
}

module.exports = route
