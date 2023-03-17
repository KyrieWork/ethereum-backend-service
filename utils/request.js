const axios = require('axios');
const Log = require('../service/log');
const log = new Log('axios_request');
const bodyLog = new Log('axios_request_body');
const shortid = require('shortid');

function request(reqObj, option) {
  const config = {
    timeout: 5 * 60 * 1000,
    headers: {
      timestamp: Date.now(),
      'tx-request-id': reqObj?.headers?.['tx-request-id'] || shortid.generate(),
    },
  };

  const opt = Object.assign({
    // 默认检测数据格式是否满足 {code: 0, message: ''}，code存在且不为0时抛出异常
    // 如需关闭，设置 checkResponseData 为 null 即可
    checkResponseData(response) {
      return new Promise(async (resolve) => {
        const resData = response.data;
        if (resData) {
          if ((resData.code !== undefined && ![0, 200].includes(resData.code))
          || (resData.errcode !== undefined && resData.errcode !== 0)) {
            const errMsg = resData?.message || resData?.errmessage || '请求失败';
            return resolve({ error: new Error(errMsg) });
          }
        }
        resolve({ res: resData });
      });
    },
  }, option);

  // create an axios instance
  const axiosInstance = axios.create({ ...config });

  axiosInstance.defaults.withCredentials = true;

  // request interceptor
  axiosInstance.interceptors.request.use(
    config => config,
    error => Promise.resolve({ error }),
  );

  function axiosLog(param) {
    const response = Object.prototype.toString.call(param) === '[object Error]' ? param.response : param;
    const type = Object.prototype.toString.call(param) === '[object Error]' ? 'error' : 'info';
    const { status, statusText, code } = response || param;
    const { headers: { 'tx-request-id': txRequestId }, url } = param.config;
    log.info({ txRequestId, status, url, duration: Date.now() - param?.config.headers?.timestamp, statusText });
    bodyLog[type]({
      txRequestId,
      url,
      code,
      status,
      statusText,
      responseData: response?.data || response,
      responseHeaders: response?.headers,
      reqParams: reqObj?.params,
      reqData: reqObj?.data,
      reqHeaders: response?.config?.headers,
    });
  }

  // response interceptor
  axiosInstance.interceptors.response.use(
    (response) => {
      // 记录每次的返回数据
      axiosLog(response);
      if (opt.checkResponseData) {
        return opt
          .checkResponseData(response)
          .then(res => Promise.resolve({ res }), error => Promise.resolve({ error }));
      }
      return Promise.resolve({ res: response });
    },
    (error) => {
      axiosLog(error);
      Promise.resolve({ error: JSON.parse(JSON.stringify(error)) });
    }, // 会打印日志，过滤掉ref
  );

  return axiosInstance.request(reqObj);
}

module.exports = request;
