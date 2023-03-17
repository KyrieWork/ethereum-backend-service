const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('../config');
const crypto = require('crypto');
const { temporary } = config.get('base');// 临时目录
const uploadPath = '\\upload';// 本地上传目录

const UploadDao = require('../dao/common/UploadDao');
const uploadDao = new UploadDao();

const cosConfig = config.get('cos');// 临时目录
const { accessKeyId, secretAccessKey, region, endpoint, bucket, apiVersion, catalogue } = cosConfig;

const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId,
  secretAccessKey,
  region,
  endpoint,
});
const s3 = new AWS.S3({ params: { Bucket: bucket }, apiVersion }); // s3接口

/**
 * 获取cos文件
 * @param data
 */
async function getCosFile(data) {
  const catalogue = data.onlineCatalogue;
  const { onlineName } = data;
  const params = {
    Key: `${catalogue}/${onlineName}`,
    Bucket: data.bucket,
  };
  return await s3.getObject(params).promise();
}

/**
 * 上传cos
 * @param files
 * @param userId
 * @returns {Promise<{error: [], resData: []}>}
 */
async function uploadCos(files, userId) {
  const datas = [];// 入库数据
  const resData = [];
  const error = [];
  // 文件上传cos
  const putObject = async (file) => {
    const paths = file.path;
    const { name } = file;
    const suffix = path.extname(name);
    let id = `${moment().utcOffset(8)
      .format('YYYYMMDDHHmmss')}${Math.round(Math.random() * 99999)}`;
    const onlineName = `${moment().utcOffset(8)
      .format('YYYY-MM-DD')}/${id}${suffix}`;
    const data = fs.readFileSync(paths);

    const params = {
      Key: `${catalogue}/${onlineName}`,
      Body: data,
    };

    const s3Res = await s3.putObject(params).promise();
    id = crypto.createHash('md5').update(id)
      .digest('hex');
    if (s3Res.ETag) {
      // 成功的
      datas.push({
        id,
        name,
        suffix,
        onlineName,
        onlineCatalogue: catalogue,
        userId,
        bucket,
        identification: s3Res.ETag,
      });
      resData.push({ fid: id, name, suffix });
    } else {
      error.push({ name });
    }
  };
  await Promise.all(files.map(i => putObject(i)));
  // 文件上传cos
  // 信息入库
  uploadDao.insertRows(datas);
  // 信息入库
  return { resData, error };
}

/**
 * 多文件写入本地
 * @returns {Promise<{status: boolean}>}
 * @param files
 */
async function upload(files) {
  try {
    const filePath = mkDirs();
    const pipe = async (file) => {
      const reader = fs.createReadStream(file.path);
      // 创建可写流
      const upStream = fs.createWriteStream(`${filePath}${file.name}`);
      // 可读流通过管道写入可写流
      reader.pipe(upStream);
    };
    await Promise.all(files.map(i => pipe(i)));
    return { status: true };
  } catch (e) {
    return { status: false, error: e };
  }
}

/**
 * 创建文件夹
 * @param type
 * @returns {string}
 */
function mkDirs(type = 1) {
  const dirPath = getCatalogue(type);
  let projectPath = path.join(process.cwd());
  const tempDirArray = dirPath.split('\\');
  tempDirArray.forEach((i) => {
    if (i) {
      projectPath = `${projectPath}\\${i}`;
      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath);
      }
    }
  });
  return `${projectPath}\\`;
}

/**
 * 获取固定目录或者每日生产目录
 * @param type
 * @returns {string}
 */
function getCatalogue(type = 1) {
  let path = `${temporary}`;
  if (type === 1) {
    path += `${uploadPath}\\${moment().utcOffset(8)
      .format('YYYY-MM-DD')}\\`;
  } else {
    path += `${uploadPath}\\uploads\\`;
  }
  return path;
}


module.exports = {
  upload,
  uploadCos,
  getCosFile,
};
