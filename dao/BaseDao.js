const fs = require('fs');
const xlsx = require('node-xlsx');
const knexHelper = require('../middleware/knexHelper');
const shortid = require('shortid');
const {
  format,
  formatDbRow,
  formatDbRows,
  camelizeField,
  deCamelizeField,
  deCamelizeObjectFields,
} = require('../utils');
const moment = require('moment');
const Joi = require('joi');

const Log = require('../service/log');

// 读写分离，区分用户
class BaseDao {
  constructor({ readonly = false } = {}) {
    this.readonly = readonly;
    this.logger = new Log(this.constructor.name);
  }

  // 只读
  get reader() {
    return new this.constructor({ readonly: true });
  }

  get readerDb() {
    return knexHelper.getDb(true);
  }

  get db() {
    return this?.readonly ?  this.readerDb : knexHelper.getDb();
  }

  chineseName = '';

  xlsxDir = './xlsx';

  // 表
  table = '';
  // 主键
  primaryKey = '';
  // 主键前缀，生成时使用
  prefixPrimaryKey = '';
  // 列表需要返回的字段
  listFileds = [];
  // 列表接口必填字段
  listRequiredFields = [];
  // 列表页允许过滤的字段
  listAllowFiterFields = [];
  // 复杂查询字段对应关系
  /**
   * 筛选字段的匹配，一个参数匹配一个字段或者匹配多个字段
   * {
   *    "name": "f_name",
   *    "query": ["f_name", "f_phone_number"]
   * }
   */
  matchKeys = null;
  // 详情需要返回的字段
  detailFields = [];
  // 创建时白名单字段
  createFields = { require: [], all: [] };
  // 可提供修改的字段
  updateFields = [];
  // 仅仅使用与updateaction，可能部分字段需要从其他接口更新
  updateFieldsOnlyForUpdateAction = [];
  // 排序字段
  orderFields = [
    { column: 'f_create_time', order: 'DESC' },
  ]
  // 时间字段，支持筛选
  timeFields = ['f_create_time', 'f_update_time'];
  // 提交的管理数据字段
  requestRelationField = '';
  // 关联表
  relationTable = '';

  relationships = null;

  // 导出表的header
  /**
   * {
   *    'f_name': '名称'
   * }
   */
  excelHeaders = null;
  exportFields = [];
  // 导出文件名
  exportFileName = '';

  // 校验规则
  baseRule = {
    updateTime: this.Joi.string(),
    createTime: this.Joi.string(),
    createUserId: this.Joi.string(),
    updateUserId: this.Joi.string(),
  }
  // 修改数据规则
  updateRules = null;
  // 添加数据规则
  createRules = null;

  enableDelete = false;

  // 机构，部门，用户用到
  treeFields = null;

  get Joi() {
    return Joi;
  }

  get createSchema() {
    return this.createRules ? Joi.object().keys({
      [camelizeField(this.primaryKey)]: this.Joi.string(),
      ...this.baseRule,
      ...this.createRules,
    }) : null;
  }

  get updateSchema() {
    return this.updateRules ? Joi.object().keys({
      [camelizeField(this.primaryKey)]: this.Joi.string(),
      ...this.updateRules,
    }) : null;
  }

  /**
   * 查询总数时不select其他字段，减少响应时间
   * @param {*} count
   * @returns
   */
  getBuilder(count = false) {
    return count ? this.db.table(this.table) : this.db.table(this.table).select(this.listFileds);
  }

  // 查询所有
  async getRows(query) {
    if (query) {
      return formatDbRows(await this.db
        .table(this.table)
        .select(this.listFileds)
        .where(query));
    }
    return formatDbRows(await this.db
      .table(this.table)
      .select(this.listFileds));
  }

  // 必填字段校验
  checkListRequiredFields(params) {
    const requestFields = Object.keys(deCamelizeObjectFields({ ...params }))
      .filter(i => this.listRequiredFields.includes(i));
    if (requestFields.length !== this.listRequiredFields.length) {
      throw new Error('缺少必填字段.');
    }
  }

  // 机构，部门，用户需要用到
  async getRowsForTree(params = {}) {
    if (!this.treeFields) {
      return [];
    }
    const query = {};
    if (Object.keys(params).length) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined) {
          query[deCamelizeField(key)] = params[key];
        }
      });
    }
    return formatDbRows(await this.db
      .table(this.table)
      .select(this.treeFields)
      .where((builder) => {
        if (Object.keys(query).length) {
          if (Object.keys(query)?.filter(i => !this.treeFields.includes(i))?.length > 0) {
            this.logger.error('error query');
            throw new Error('非法操作');
          }
          Object.keys(query).forEach((key, index) => {
            const method = index === 0 ? 'where' : 'andWhere';
            if (key.includes('_id')) {
              builder[method](key, query[key]);
            } else {
              builder[method](key, 'like', `%${query[key]}%`);
            }
          });
        }
      }));
  }

  /**
   * 查询生成
   * @param {*} count
   * @returns
   */
  getCountAndRowsBuilder(params, { whereIn = null, orWhere = null, orderFields, count = false } = {}) {
    const reqParams = { ...params };
    const primaryBuilder = () => this.getBuilder(count)
      .where((builder) => {
        if (whereIn && Object.keys(whereIn).length) {
          Object.keys(whereIn).forEach(key => builder.whereIn(key, whereIn[key]));
        }
        if (orWhere && Object.keys(orWhere).length) {
          Object.keys(orWhere).forEach((key, index) => {
            if (index === 0) {
              builder.where(key, orWhere[key]);
            } else {
              builder.orWhere(key, whereIn[key]);
            }
          });
        }
        if (reqParams) {
          Object.keys(reqParams).forEach((key, index) => {
            const method = index === 0 ? 'where' : 'andWhere';
            const value = reqParams[key];
            const dbField = deCamelizeField(key);
            const tableField = `${this.table}.${dbField}`;
            if (this.timeFields.includes(dbField) && this.listAllowFiterFields.includes(dbField)) { // 时间类筛选
              if (value.includes('/')) { // 查时间区间
                const [start, end] = value.split('/');
                if (!start || !end) {
                  throw new Error('时间间隔格式错误.');
                }
                builder[method](tableField, '>', start);
                builder.andWhere(tableField, '<', end);
              } else {
                builder[method](tableField, 'like', `%${value}%`);
              }
            } else if (this.matchKeys && this.matchKeys[key]) { // 连表类筛选
              if (Array.isArray(this.matchKeys[key])) { // 一个参数匹配多个字段
                this.matchKeys[key].forEach((matchKey, matchIndex) => {
                  matchIndex === 0
                    ? builder[method](matchKey, 'like', `%${value}%`)
                    : builder.orWhere(matchKey, 'like', `%${value}%`);
                });
              } else {
                builder[method](this.matchKeys[key], 'like', `%${value}%`);
              }
            } else {
              if (this.listAllowFiterFields.includes(dbField)) { // 本表筛选
                builder[method](tableField, 'like', `%${value}%`);
              }
            }
          });
        }
      });
    // 适配不需要排序的
    if (!orderFields) {
      return primaryBuilder();
    }
    if (!Array.isArray(orderFields)) {
      return primaryBuilder().orderByRaw(orderFields.raw, orderFields.value);
    }
    return primaryBuilder().orderBy(orderFields);
  }

  // 根据接口参数生成排序对象
  generateSortFields(sort) {
    let orderFields = [...this.orderFields.map(i => ({ ...i, column: `${this.table}.${i.column}` }))];
    if (sort) {
      orderFields = sort.split(',').map(i => (i.startsWith('-')
        ? ({ column: `${this.table}.${deCamelizeField(i.substring(1))}`, order: 'DESC' })
        : ({ column: `${this.table}.${deCamelizeField(i)}`, order: 'ASC' })));
    }
    return orderFields;
  }

  // 处理成 whereIn 或者 orWhere
  generateExtraQuery() {
    return { whereIn: null, orWhere: null };
  }

  /**
   * 查询总数和当前页数据
   * @returns
   */
  async getCountAndRows(params) {
    this.checkListRequiredFields(params);
    const { page, pageSize, sort, ...otherParams } = params;
    const orderFields = this.generateSortFields(sort, otherParams);
    const extraQuery = this.generateExtraQuery(otherParams);
    const [content, [{ count }]] = await Promise.all([
      this.getCountAndRowsBuilder(otherParams, { orderFields, ...extraQuery })
        .limit(pageSize)
        .offset(pageSize * (page - 1)),
      this.getCountAndRowsBuilder(otherParams, { orderFields, ...extraQuery, count: true })
        .count({ count: `${this.table}.${this.primaryKey}` }),
    ]);
    return {
      count,
      content: formatDbRows(content),
    };
  }

  async getRow(query) {
    const [row] = await this.db
      .table(this.table)
      .select(this.detailFields)
      .where(query);
    return row;
  }

  /**
   * 查询详情
   * @param {*} id
   * @returns
   */
  async getRowById(id) {
    const [res] = await this.db
      .table(this.table)
      .select(this.detailFields)
      .where({ [this.primaryKey]: id });
    return formatDbRow(res);
  }

  /**
   * 根据id查询记录是否存在
   * @param {*} id
   * @returns
   */
  async isExist(id) {
    const [row] = await this.db
      .table(this.table)
      .select([this.primaryKey])
      .where(this.primaryKey, id);
    return !!row;
  }

  // 生成随机id
  generateId() {
    return `${this.prefixPrimaryKey}${shortid.generate()}`;
  }

  // 初始化创建之前的数据
  // 生成id，关联创建人
  async generateCreateData(params, userId) {
    const body = {
      ...params,
      createUserId: userId,
      updateUserId: userId,
    };
    body[camelizeField(this.primaryKey)] = this.generateId();
    return body;
  }

  async generateCreateDataNoUser(params) {
    const body = params;
    body[camelizeField(this.primaryKey)] = this.generateId();
    return body;
  }

  /**
   * 校验tag是否正确
   * @param {*} ids
   * @returns
   */
  async validateTag(ids) {
    const records = this.db
      .table('t_table')
      .where('f_business', this.tagKey)
      .whereIn('f_tag_id', ids)
      .count({ count: 'f_tag_id' });
    return records.length === ids.length;
  }

  generateRelation() {
    return null;
  }

  async afterCreate() {
    return true;
  }

  // 创建
  async create(params, userId) {
    const body = await this.generateCreateData({ ...params }, userId);
    let relationships = null;
    if (this.relationships) {
      relationships = this.generateRelation(body, params) ;
      Object.keys(this.relationships).forEach(key => delete body[key]);
    }
    if (Array.isArray(body)) {
      return await this.insertRows(body, relationships);
    }
    await this.insertRows([body], relationships ? [relationships] : []);

    const deCamelizePrimaryKey = camelizeField(this.primaryKey);
    const ids = Array.isArray(body) ? body.map(i => i?.[deCamelizePrimaryKey]) : body?.[deCamelizePrimaryKey];

    this.afterCreate(ids);

    return ids;
  }

  /**
   * 批量插入数据
   * @param {*} rows
   */
  async insertRows(rows, relationships = []) {
    const array = [];
    rows.forEach((row) => {
      const item = { ...row };
      const formatObj = deCamelizeObjectFields(item);
      const keys = Object.keys(formatObj);
      const all = keys.filter(i => !this.createFields.all.includes(i));
      if (all && all.length) {
        throw new Error(`字段不被允许. ${all.map(i => camelizeField(i)).join(', ')}.`);
      }
      const require = this.createFields.require.filter(i => !keys.includes(i));
      if (require && require.length) {
        throw new Error(`缺少必填字段. ${require.map(i => camelizeField(i)).join(', ')}`);
      }
      array.push(formatObj);
    });
    this.validateData(array);

    await this.db.transaction(async (trx) => {
      await trx.table(this.table).insert(array);
      if (relationships && relationships.length > 0) {
        const relationshipRequest = [];
        relationships.forEach((relationship) => {
          Object.keys(relationship).forEach((key) => {
            const relationshipData = relationship[key];
            if (Array.isArray(relationshipData)) {
              relationshipData.length && relationshipRequest.push(trx.table(this.relationships[key].table)
                .insert(relationship[key]));
            } else {
              Object.keys(relationshipData).length && relationshipRequest.push(trx.table(this.relationships[key].table)
                .insert(relationship[key]));
            }
          });
        });
        await Promise.all(relationshipRequest);
      }
    });
  }

  // 生成修改对象
  // 只从提交的数据拿到可以修改的字段对应的值
  generateUpdateData(params, userId) {
    const obj = {};
    this.updateFields.forEach((key) => {
      const value = params[camelizeField(key)];
      if (value !== undefined) {
        obj[key] = value;
      }
    });
    if (userId) {
      obj.updateUserId = userId;
    }
    if (Object.keys(obj).length < 1) {
      return null;
    }
    return obj;
  }

  async afterUpdate() {
    return true;
  }

  // 修改
  async update(id, params, userId) {
    const record = await this.getRowById(id, { userId });
    if (!record) {
      throw new Error('无效数据.');
    }
    const data = deCamelizeObjectFields(this.generateUpdateData(params, userId));
    if (!data) {
      throw new Error('未做更新.');
    }
    this.validateData(data, true);
    await this.db.transaction(async (trx) => {
      await trx.table(this.table)
        .where({ [this.primaryKey]: id })
        .update(data);
    });

    this.afterUpdate(id);
  }

  /**
   * 数据校验
   * @param {*} data
   * @param {*} update
   */
  validateData(data, update = false) {
    if (!data) {
      return true;
    }
    const schema = update ? this.updateSchema : this.createSchema;
    const primaryValidateData = (_data) => {
      const { error } = schema.validate(formatDbRow(_data));
      if (error) {
        throw new Error(error.stack);
      }
    };
    if (schema) {
      if (Array.isArray(data)) {
        data.forEach((item) => {
          primaryValidateData(item);
        });
      } else {
        primaryValidateData(data);
      }
    }
  }

  /**
   * 批量更新
   * @param {*} data
   * @param {*} userId
   */
  async bulkUpdate(data, userId) {
    // 先校验是否都存在
    const ids = data.map(i => i[camelizeField(this.primaryKey)]);
    if (!ids || ids.length < 1) {
      throw new Error('无效数据.');
    }
    const records = await this.db.table(this.table).whereIn(this.primaryKey, ids);
    if (ids.length !== records.length) {
      throw new Error('无效数据.');
    }
    return await Promise.all(data.map(i => this.update(i[camelizeField(this.primaryKey)], i, userId)));
    /* const req = data
      .map(i => deCamelizeObjectFields(this.generateUpdateData(i, userId)))
      .filter(i => !!i);
    this.validateData(req, true);
    await this.db.transaction(async (trx) => {
      await Promise.all(req.map((i, index) => trx.table(this.table)
        .where({ [this.primaryKey]: data[index][camelizeField(this.primaryKey)] })
        .update(i)));
    }); */
  }

  // 可以做一些删除之前的校验
  async beforeDelete() {
    return true;
  }

  async afterDelete() {
    return true;
  }

  // 删除
  async delete(id, userId) {
    if (!this.enableDelete) {
      return new Error('数据不可删除.');
    }
    if (!await this.getRowById(id)) {
      throw new Error('无效数据.');
    }
    await this.beforeDelete(id);
    const [data] = await this.db
      .table(this.table)
      .select('*')
      .where(this.primaryKey, id);
    await this.db.transaction(async (trx) => {
      await Promise.all([
        trx
          .table(this.table)
          .where(this.primaryKey, id)
          .del(),
        trx
          .table('t_table_recycle')
          .insert({
            f_table: this.table,
            f_data: JSON.stringify({ ...data }),
            f_create_user_id: userId,
          }),
      ]);
    });

    await this.afterDelete();
  }

  /**
   * 批量删除
   * @param {*} ids
   */
  async bulkDelete(ids, userId) {
    const records = await this
      .db
      .table(this.table)
      .whereIn(this.primaryKey, ids);
    if (ids.length !== records.length) {
      throw new Error('存在无效参数');
    }
    await this.beforeDelete(ids);
    const data = await this.db
      .table(this.table)
      .select('*')
      .whereIn(this.primaryKey, ids);
    await this.db.transaction(async (trx) => {
      await Promise.all([
        trx
          .table(this.table)
          .whereIn(this.primaryKey, ids)
          .delete(),
        trx
          .table('t_table_recycle')
          .insert(data.map(i => ({
            f_table: this.table,
            f_data: JSON.stringify({ ...i }),
            f_create_user_id: userId,
          }))),
      ]);
    });
  }

  /**
   * 生成id
   * @returns {string}
   */
  createNumber() {
    return `${moment()
      .utcOffset(8)
      .format('YYYYMMDDHHmmss')}${Math.round(Math.random() * 99999)}`;
  }

  get timefile() {
    return `${this.chineseName ? this.chineseName : this.constructor.name}_${moment().utcOffset(8)
      .format('YYYY-MM-DD--HH-mm-ss')}.xlsx`;
  }

  async beforeExport(data) {
    return data;
  }

  // 查询需要导出的数据
  async getExportData(query = null) {
    const records = await this.db
      .table(this.table)
      .select(this.exportFields)
      .where((builder) => {
        if (query && Object.keys(query).length > 0) {
          Object.keys(query).forEach((key, index) => {
            if (this.listAllowFiterFields.includes(deCamelizeField(key))) {
              const method = index === 0 ? 'where' : 'andWhere';
              builder[method](deCamelizeField(key), 'like', `%${query[key]}%`);
            }
          });
        }
      });
    return await this.beforeExport(records);
  }

  /**
   * 导出
   * @param {*} params
   */
  async export(query) {
    const data = formatDbRows(await this.getExportData(query))
      .map(i => Object.values(i).map(i => i ?? ''));

    const { buffer, filename } = this.generateExcelFile({
      filename: `${this.exportFileName || this.table.replace('t_', '')}_${format(new Date(), '%Y-%m-%d')}.xlsx`,
      data: [
        Object.values(this.excelHeaders),
        ...data,
      ],
    });

    return { buffer, filename };
  }

  generateExcelFile({ filename, data }) {
    const buffer = xlsx
      .build([{
        name: 'sheet',
        data,
      }]);

    if (!fs.existsSync(this.xlsxDir)) {
      fs.mkdirSync(this.xlsxDir);
    }
    fs.writeFileSync(`${this.xlsxDir}/${filename}`, buffer, 'binary');

    return { buffer, filename };
  }

  // 导出模板
  async exportTemplate() {
    const data = this.tempalteData;
    const buffer = xlsx
      .build([{
        name: 'sheet',
        data: [
          Object.values(this.excelHeaders),
          ...data,
        ],
      }]);

    // 生成临时目录
    if (!fs.existsSync(this.xlsxDir)) {
      fs.mkdirSync(this.xlsxDir);
    }
    const filename = `${this.exportFileName || this.table.replace('t_', '')}_${format(new Date(), '%Y-%m-%d')}.xlsx`;
    fs.writeFileSync(`${this.xlsxDir}/${filename}`, buffer, 'binary');

    return { buffer, filename };
  }

  // 校验表头
  validateExcelHeaders(headers) {
    if (!headers || headers?.length < 1) {
      this.logger.error('表头为空');
      throw new Error('无法找到对应的数据表字段，请按照数据模板上传文件');
    }
    const existFields = Object.values(this.excelHeaders)
      .filter(i => !headers.includes(i)) || [];
    if (existFields.length > 0) {
      this.logger.error({ msg: '字段不匹配', headers });
      throw new Error('无法找到对应的数据表字段，请按照数据模板上传文件');
    }
  }

  // 处理导入的excel数据
  formatImportData(file) {
    const [{ data }] = xlsx.parse(file);
    const header = data.shift();
    this.validateExcelHeaders(header);
    const result = data.map((item) => {
      const obj = {};
      Object.keys(this.excelHeaders).forEach((key) => {
        const index = header.findIndex(i => i === this.excelHeaders[key]);
        if (index > -1) {
          obj[key] = item[index];
        }
      });
      if (Object.keys(obj).length < 1) {
        return null;
      }
      return obj;
    })
      .filter(i => !!i);
    if (!result || result.length < 1) {
      throw new Error('请确认数据是否正确，当前未解析到任何匹配数据.');
    }
    return result;
  }

  /**
   * 导入之前处理数据，或加校验
   * @param {*} data
   * @param {*} body
   * @returns
   */
  async beforeImport(data, body) {
    return body ? data : data;
  }

  // 导入
  async import(file, { body, userId }) {
    let data = this.formatImportData(file);
    data = await this.beforeImport(data, body);
    data = await Promise.all(data.map(i => this.generateCreateData(i, userId)));
    await this.insertRows(data.map(i => i.body));
  }

  /**
   * 下载导入失败的excel文件
   * @param {*} filename
   * @returns
   */
  async importDownload(filename) {
    const path = `${this.xlsxDir}/${filename}`;
    if (!fs.existsSync(path)) {
      return null;
    }
    return fs.readFileSync(path);
  }
}

module.exports = BaseDao;
