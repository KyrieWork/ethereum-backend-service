const crypto = require('crypto');
const cryptoJs = require('crypto-js');
const { SM4Util } = require('./sm4');

class Crypto {
  // 解密
  static createDecipher(data, key, algorithm = 'aes192') {
    if (!data) {
      return '';
    }
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // 加密
  static createCipher(src, key, algorithm = 'aes192') {
    let sign = '';
    const cipher = crypto.createCipher(algorithm, key);
    sign += cipher.update(src, 'utf8', 'hex');
    sign += cipher.final('hex');
    return sign;
  }

  static HMACSHA256(src, key) {
    return crypto.createHmac('sha256', src).update(key)
      .digest('hex');
  }

  // 前端使用的 hmacSHA256
  static hmacSHA256(src, key = '') {
    return cryptoJs.HmacSHA256(src, key).toString();
  }

  static md5(string) {
    return crypto.createHash('md5').update(string)
      .digest('hex');
  }

  // 粤政易的HA256
  static encodeBySHA256(string) {
    return crypto.createHash('sha256').update(string)
      .digest('hex');
  }

  /**
   * DES 对称加密
   *  1） 加密模式：ECB 模式
      2） 加密密钥：应用在粤政易平台注册时分配的密钥
      3） 编码方式：HEX 十六进制
      4） 字符集：utf-8
      应用需通过应用密钥进行 DES 解密获取敏感数据的明文信息
   */
  static des() {}

  // sm4加密
  static sm4Encrypt({ key }, plain) {
    const s4 = new SM4Util();
    s4.secretKey = key;
    return s4.encryptData_ECB(plain);
  }

  // sm4解密
  static sm4Decrypt({ key }, cipher) {
    const s4 = new SM4Util();
    s4.secretKey = key;
    return s4.decryptData_ECB(cipher);
  }
}

module.exports = Crypto;
