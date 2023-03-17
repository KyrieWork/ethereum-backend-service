const UserDao = require('../dao/manage/UserDao');
const userDao = new UserDao();

const Log = require('../service/log');
const forbidden = new Log('forbidden');

const config = require('../config');
const { namespaceWhiteList } = config.get('auth');

class Controller {
  constructor() {
    this.logger = new Log(this.constructor.name);
    return new Proxy(this, {
      get(target, key) {
        if (key.includes('Action')) {
          return async function (...args) {
            await target.checkAccess({
              controller: target.constructor.name,
              action: key,
            }, target[key].bind(target), ...args);
          };
        }
        return target[key];
      },
    });
  }

  /**
   * 校验是否有当前动作的权限
   * 如果没有捕获错误，这里统一捕获到错误，返回给前端500
   * @param {*} param
   * @param {*} callback
   * @param  {...any} args
   */
  async checkAccess({ controller, action }, callback, ...args) {
    const [ctx] = args;
    // 通过签名认证就不校验权限了，晓雨说的
    if (ctx?.signed) {
      return await this.next(ctx, callback, args);
    }
    const { userId } = ctx.session.user || {};
    const { namespace, permissionName } = this.generateOperationPermission({ ctx, controller, action }) || {};
    // 临时
    if (!namespace || !permissionName) {
      return await this.next(ctx, callback, args);
    }
    if (namespaceWhiteList.includes(namespace)) {
      return await this.next(ctx, callback, args);
    }
    const hasPermission = await userDao.checkAccess(userId, namespace, permissionName);
    if (hasPermission) {
      return await this.next(ctx, callback, args);
    }
    forbidden.error(`${userId} access denied. (permission: ${namespace}.${permissionName}. controller: ${controller}. action: ${action})`);
    ctx.throw(403, 'Access denied');
  }

  getNamespace(ctx) {
    const routerPathSplit = ctx.routerPath.split('/');
    return routerPathSplit?.[2];
  }

  /**
   * 在当前操作下匹配到对应的权限名称
   * @param {*} ctx
   * @param {*} controllerName
   * @param {*} actionName
   * @returns
   */
  generateOperationPermission({ ctx, controller: controllerName, action: actionName }) {
    // 根据路由区分系统
    const namespace = this.getNamespace(ctx);
    // 当前的controller
    const controller = controllerName.replace('Controller', '');
    const action = actionName.replace('Action', '');

    return { namespace, permissionName: `${controller.substring(0, 1).toLowerCase()}${controller.substring(1)}.${action}` };
  }


  async next(ctx, callback, args) {
    try {
      return await callback(...args);
    } catch (e) {
      this.logger.error(e);
      ctx.throw(500, 'Internal Server Error.');
    }
  }
}

module.exports = Controller;
