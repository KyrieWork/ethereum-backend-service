const fs = require('fs')
const path = require('path')
const moment = require('moment')
const { getClientIP /* mkDirs */ } = require('../utils/index')
const config = require('../config')

const logDir = 'logs'

class Log {
  constructor(fileName, { splitByHour } = {}) {
    this.fileName = fileName || 'log'
    this.splitByHour = !!splitByHour
  }

  get today() {
    return moment().utcOffset(8).format('YYYY-MM-DD')
  }

  get now() {
    return moment().utcOffset(8).format('YYYY-MM-DD HH:mm:ss')
  }

  get hour() {
    return moment().utcOffset(8).format('YYYY-MM-DD--HH')
  }

  file(type) {
    return path.resolve(
      `${logDir}/${this.today}/${this.fileName}_${this.splitByHour ? this.hour : this.today}_${type}.log`
    )
  }

  write(fileName, content, extra) {
    if (fileName.includes('../')) {
      throw new Error('不能跨目录创建文件')
    }
    // mkDirs(`${logDir}/${this.today}/`);// 创建目录
    const dir = `${logDir}/${this.today}/`
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const logFile = fs.createWriteStream(fileName, {
      flags: 'a', // 文件的打开模式
      mode: 0o666, // 文件的权限设置
      encoding: 'utf8', // 写入文件的字符的编码
      highWaterMark: 3, // 最高水位线
      start: 0, // 写入文件的起始索引位置
      autoClose: true, // 是否自动关闭文档
    })
    const logger = new console.Console(logFile)
    const extraString = Object.prototype.toString.call(extra) === '[object Object]' ? JSON.stringify(extra) : extra
    if (extra) {
      logger.log(`${this.now} ${extraString}`)
    }
    const contentString = ['[object Object]', '[object Array]'].includes(Object.prototype.toString.call(content))
      ? JSON.stringify(content)
      : content
    logger.log(`${this.now} ${contentString}`)
    if (Object.prototype.toString.call(content) === '[object Error]') {
      logger.log(content)
    }
    // 换行
    // logger.log('');
  }

  info(content, extra = null) {
    this.write(this.file('info'), content, extra)
  }

  error(content, extra = null) {
    this.write(this.file('error'), content, extra)
  }

  ctxError(ctx, error) {
    const { session, id } = ctx || {}
    const user = session?.user || {}
    const extra = {
      requestId: id,
      url: ctx.url,
      query: ctx.request?.query,
      body: ctx.request?.body,
      input: ctx.request,
      userId: user?.userId || '',
      operatorIp: getClientIP(ctx.req),
      header: ctx.request.header,
    }
    this.write(this.file('error'), error, extra)
  }
}

module.exports = Log
