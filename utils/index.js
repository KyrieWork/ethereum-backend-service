const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const { createDecipher } = require('./crypto');
const config = require('../config');
const dataDesensitization = config.get('dataDesensitization');


function format(date, rformat = '%Y-%m-%d %H:%M:%S', rtimeType = '') {
  let timeType = rtimeType;
  let format = rformat;
  if (!date) {
    return '';
  }
  const dateType = typeGetter(date);
  if (dateType !== '[object Date]') {
    if (dateType === '[object String]') return date;
    return new Error('wrong date type');
  }
  const allowedType = ['UTC'];
  if (!~allowedType.indexOf(timeType)) {
    timeType = '';
  }
  const placehodler = {
    '%Y': `get${timeType}FullYear`,
    '%m': `get${timeType}Month`,
    '%d': `get${timeType}Date`,
    '%H': `get${timeType}Hours`,
    '%M': `get${timeType}Minutes`,
    '%S': `get${timeType}Seconds`,
  };
  _.each(
    placehodler,
    (rvalue, key) => {
      let value = rvalue;
      if (key === '%Y') {
        value = date[value]();
      } else {
        if (key === '%m') {
          value = insertZero(date[value]() + 1, 2);
        } else {
          value = insertZero(date[value](), 2);
        }
      }
      format = format.replace(key, value);
    },
    this,
  );
  return format;
}

function insertZero(rnum, rcount) {
  let num = rnum;
  let count = rcount;
  num = `${parseInt(num, 10) || 0}`;
  count = count || 0;
  if (count <= 0 || count <= num.length) return num;
  return new Array(count + 1 - num.length).join('0') + num;
}

function typeGetter(inputs) {
  return Object.prototype.toString.call(inputs);
}

/**
 * 例：把 f_project_id 转换为 projectId
 * @param {*} fieldName
 */
function camelizeField(rfieldName) {
  const fieldName = rfieldName.replace(/^f_/, '');
  const arr = fieldName.split('_');
  return arr
    .map((item, index) => {
      if (index === 0 || item.length === 0) {
        return item;
      }
      return item[0].toUpperCase() + item.slice(1);
    })
    .join('');
}

function camelizeObjectFields(obj) {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    newObj[camelizeField(key)] = obj[key];
  });
  return newObj;
}

function formatDbRow(obj) {
  if (!obj) {
    return null;
  }
  const formatted = camelizeObjectFields(obj);
  const { createTime, updateTime } = formatted;
  if (createTime) {
    formatted.createTime = format(formatted.createTime);
  }
  if (updateTime) {
    formatted.updateTime = format(formatted.updateTime);
  }
  return formatted;
}

function formatDbRows(list) {
  return list?.map(item => formatDbRow(item)) || [];
}

function fieldKeyToLine(key) {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function formatParamsField(obj) {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    const newKey = fieldKeyToLine(key);
    newObj[newKey] = obj[key];
  });
  return newObj;
}

/**
 * 例：把 projectId 转换为 f_project_id
 * @param {*} str
 */
function deCamelizeField(str) {
  if (/^f_/.test(str)) {
    return str;
  }
  const reg = /[A-Z]/g;
  return `f_${str.replace(
    reg,
    matched => `_${matched.toLocaleLowerCase()}`,
  )}`;
}

function deCamelizeObjectFields(obj) {
  if (!obj) {
    return null;
  }
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    newObj[deCamelizeField(key)] = obj[key];
  });
  return newObj;
}

function deCamelizeObjectFieldsRows(array) {
  const newArray = array.map(i => deCamelizeObjectFields(i));
  return newArray;
}

/**
 * 获取客户端ip地址
 * @param req
 * @returns {*|string[]|string}
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for'] // 判断是否有反向代理 IP
    || req.connection?.remoteAddress // 判断 connection 的远程 IP
    || req.socket?.remoteAddress // 判断后端的 socket 的 IP
    || req.connection?.socket?.remoteAddress
  );
}

/**
 * 创建文件夹
 * @returns {string}
 * @param dirPath
 */
function mkDirs(dirPath) {
  let projectPath = path.join(process.cwd());
  const tempDirArray = dirPath.split('/');
  tempDirArray.forEach((i) => {
    if (i) {
      projectPath = `${projectPath}/${i}`;
      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath);
      }
    }
  });
  return `${projectPath}/`;
}

// 生成密码
// 须至少8位包含大写字母、小写字母、数字
// 至少8位且同时包含：字母(大小写都有) + 数字
// 最多20位
function generatePassword() {
  try {
    // 备选字符
    const string = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.`~!@#$%^&*()-_=+';
    const letterAndNumberLength = 8; // 字母数字至少八个
    const length = Math.round(Math.random() * (20 - 8) + 8);
    const lowercaseLetterLength = 4; // 四个小写
    const uppercaseLetterLength = 2; // 两个大写
    const numberLength = 2; // 两个数字
    const lowercaseLetterArray = new Array(lowercaseLetterLength)
      .fill('a')
      .map(i => i.replace('a', string[Math.round(Math.random() * (36 - 10) + 10)]));
    const uppercaseLetterArray = new Array(uppercaseLetterLength)
      .fill('a')
      .map(i => i.replace('a', string[Math.round(Math.random() * (62 - 36) + 36)]));
    const numberArray = new Array(numberLength)
      .fill('a')
      .map(i => i.replace('a', string[Math.round(Math.random() * 10)]));
    const otherArray = new Array(length - letterAndNumberLength)
      .fill('a')
      .map(i => i.replace('a', string[Math.round(Math.random() * 79)]));

    return [
      ...lowercaseLetterArray,
      ...uppercaseLetterArray,
      ...numberArray,
      ...otherArray,
    ].join('');
  } catch (e) {
    console.log(e);
    throw new Error('初始化密码失败');
  }
}

function isEmptyArray(array) {
  if (Object.prototype.toString.call(array) !== '[object Array]') {
    return false;
  }
  if (array.filter(i => !!i).length) {
    return array;
  }
  return false;
}

function toFixed(number, degit = 4) {
  return parseInt(number * 10 ** degit, 10) / 10 ** degit;
}

function groupBy(slice, key) {
  return slice.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}

// 把秒数转成 小时 + 分钟格式
function secondsFormat(seconds) {
  if (!seconds) {
    return '0s';
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const m = parseInt(seconds / 60, 10);
  if (m < 60) {
    const yu = seconds % 60;
    return `${m}m${yu}s`;
  }
  const h = parseInt(m / 60, 10);
  const yu = m % 60;
  return `${h}h${yu}m`;
}

async function decryptDatas({ data, encryptConf }) {
  if (!(encryptConf instanceof Object) || !(data instanceof Object)) {
    return;
  }
  for (const k of Object.keys(encryptConf)) {
    if (encryptConf[k] instanceof Object) {
      if (data[k] instanceof Array) {
        for (const v of data[k]) {
          decryptDatas({
            data: v,
            encryptConf: encryptConf[k],
          });
        }
      } else {
        decryptDatas({
          data: data[k],
          encryptConf: encryptConf[k],
        });
      }
    } else {
      if (typeof (data[k]) === 'string' && data[k] !== '') {
        try {
          // eslint-disable-next-line no-param-reassign
          data[k] = createDecipher(data[k], dataDesensitization.key, dataDesensitization.algorithm);
        } catch (e) {
          // log.error(`解密失败: data[k]=${data[k]}`, e);
        }
      }
    }
  }
}

module.exports = {
  format,
  insertZero,
  typeGetter,
  camelizeField,
  camelizeObjectFields,
  formatDbRow,
  formatDbRows,
  fieldKeyToLine,
  formatParamsField,
  deCamelizeField,
  deCamelizeObjectFields,
  deCamelizeObjectFieldsRows,
  getClientIP,
  mkDirs,
  generatePassword,
  isEmptyArray,
  toFixed,
  groupBy,
  secondsFormat,
  decryptDatas,
};
