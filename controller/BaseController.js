const { camelizeField } = require('../utils')
const Controller = require('./Controller')
class BaseController extends Controller {
  // 基本路由
  routes() {
    return [
      { method: 'get', path: '/', action: this.listAction },
      { method: 'get', path: '/:id', action: this.detailAction },
      { method: 'put', path: '/:id', action: this.updateAction },
      { method: 'post', path: '/', action: this.createAction },
      { method: 'delete', path: '/:id', action: this.deleteAction },
    ]
  }

  /**
   * 获取列表
   * @param {*} ctx
   */
  async listAction(ctx) {
    try {
      const { page = 1, pageSize = 10, ...query } = ctx.query
      const { userId } = ctx.session.user || {}
      const { content, count } = await this.dao.reader.getCountAndRows({
        page,
        pageSize,
        ...query,
        userId,
      })

      ctx.customJson({
        page: {
          number: Number(page),
          pageSize: Number(pageSize),
          totalPages: Math.ceil(count / pageSize),
          totalElements: count,
        },
        content,
      })
    } catch (e) {
      ctx.error(e, { message: '获取列表失败' })
    }
  }

  async detailAction(ctx) {
    const { id } = ctx.request.params

    const data = await this.dao.reader.getRowById(id, ctx.session.user)

    ctx.customJson(data)
  }

  /**
   * 创建
   */
  async createAction(ctx) {
    try {
      const { userId } = ctx.session.user || {}
      const data = await this.dao.create(ctx.request.body, userId)
      ctx.customJson(data)
    } catch (e) {
      ctx.error(e, { message: '创建失败' })
    }
  }

  // 修改
  async updateAction(ctx) {
    try {
      const { body } = ctx.request
      const { updateFieldsOnlyForUpdateAction } = this.dao
      if (
        Object.keys(body).filter(
          (key) =>
            updateFieldsOnlyForUpdateAction.length &&
            !updateFieldsOnlyForUpdateAction.map((i) => camelizeField(i)).includes(key)
        ).length > 0
      ) {
        return ctx.error({ message: '请勿提交不可修改的字段' })
      }

      const { id } = ctx.request.params
      const { userId } = ctx.session.user || {}
      const data = await this.dao.update(id, body, userId)
      ctx.customJson(data)
    } catch (e) {
      ctx.error(e, { message: '更新失败' })
    }
  }

  // 删除
  async deleteAction(ctx) {
    try {
      const { id } = ctx.request.params
      const { userId } = ctx.session.user || {}
      const data = await this.dao.delete(id, userId)
      ctx.customJson(data)
    } catch (e) {
      ctx.error(e, { message: '删除失败' })
    }
  }

  /**
   * 批量删除
   * @param {*} ctx
   */
  async bulkDeleteAction(ctx) {
    try {
      const { body } = ctx.request
      const { userId } = ctx.session.user || {}
      const data = await this.dao.bulkDelete(body, userId)
      ctx.customJson(data)
    } catch (e) {
      ctx.error(e, { message: '删除失败' })
    }
  }

  /**
   * 批量修改
   * @param {*} ctx
   */
  async bulkUpdateAction(ctx) {
    try {
      const { body } = ctx.request

      const { primaryKey, updateFieldsOnlyForUpdateAction } = this.dao
      if (
        [...new Set(body.map((i) => Object.keys(i).filter((i) => i !== camelizeField(primaryKey))).flat())].filter(
          (i) =>
            updateFieldsOnlyForUpdateAction.length &&
            !updateFieldsOnlyForUpdateAction.map((i) => camelizeField(i)).includes(i)
        ).length
      ) {
        return ctx.error({ message: '请勿提交不可修改的字段' })
      }

      const { userId } = ctx.session.user || {}
      const data = await this.dao.bulkUpdate(body, userId)
      ctx.customJson(data)
    } catch (e) {
      ctx.error(e, { message: '更新失败' })
    }
  }

  /**
   *  导出
   * @param {*} ctx
   */
  async exportAction(ctx) {
    try {
      const { query } = ctx.request
      const { type } = ctx.request.params
      let func = ''
      if (type && type === 'template') {
        func = 'exportTemplate'
      } else {
        func = 'export'
      }
      const { buffer, filename } = await this.dao.reader[func](query)

      ctx.set('Content-Type', 'application/vnd.openxmlformats;charset=utf-8')
      ctx.set('Content-Disposition', `attachment;filename=${encodeURIComponent(filename)}`)

      ctx.body = buffer
    } catch (e) {
      ctx.error(e, { message: '导出失败' })
    }
  }

  /**
   * 导入
   */
  async importAction(ctx) {
    try {
      const { file } = ctx.request.files
      if (!file) {
        ctx.error('请上传excel表以导入')
      }
      const { path } = file
      const { userId } = ctx.session.user || {}
      const { body } = ctx.request
      const { buffer, filename } = (await this.dao.import(`${path}`, { body, userId })) || {}

      // return ctx.customJson({ errors, resError });

      if (buffer && filename) {
        ctx.set('Content-Type', 'application/vnd.openxmlformats;charset=utf-8')
        ctx.set('Content-Disposition', `attachment;filename=${encodeURIComponent(filename)}`)
        return (ctx.body = buffer)
      }

      ctx.customJson()
    } catch (e) {
      ctx.error(e, { message: '导入失败' })
    }
  }

  async importTemplateAction(ctx) {
    try {
      const { buffer, filename } = await this.dao.exportTemplate()

      ctx.set('Content-Type', 'application/vnd.openxmlformats;charset=utf-8')
      ctx.set('Content-Disposition', `attachment;filename=${encodeURIComponent(filename)}`)
      return (ctx.body = buffer)
    } catch (e) {
      ctx.error(e, { message: '获取模板失败' })
    }
  }

  /**
   * 下载导入错误文件
   * @param {*} ctx
   */
  async importDownloadAction(ctx) {
    const { filename } = ctx.request.query

    if (!filename) {
      return ctx.error({ message: '缺少参数' })
    }
    const buffer = await this.dao.importDownload(filename)

    if (!buffer) {
      return ctx.error({ message: '文件已过期' })
    }

    ctx.set('Content-Type', 'application/vnd.openxmlformats;charset=utf-8')
    ctx.set('Content-Disposition', `attachment;filename=${encodeURIComponent(filename)}`)
    return (ctx.body = buffer)
  }

  async transferAction(ctx) {
    const data = await this.dao.transfer()
    ctx.customJson(data)
  }
}

module.exports = BaseController
