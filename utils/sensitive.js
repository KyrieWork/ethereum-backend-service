
/**
 * 名字加星
 * @param name
 * @returns {string}
 */
function formatName(name) {
  if (name) {
    let str;
    if (name.length === 2) {
      str = `${name.substr(0, 1)}*`;
    } else if (name.length > 2) {
      const char = '*'.repeat(name.length - 2);
      str = name.substr(0, 1) + char + name.substr(-1, 1);
    } else {
      str = '';
    }
    return str;
  }
  return '';
}

/**
 * 手机号加星
 * @param mobile
 * @returns {string}
 */
function formatMobile(mobile) {
  if (null !== mobile && mobile !== undefined && mobile.length === 11) {
    const pat = /(\d{3})\d*(\d{4})/;
    return mobile.replace(pat, '$1****$2');
  }
  return '';
}

/**
 * 证件号加星
 * @param no
 * @returns {string}
 */
function formatCertificateNo(no) {
  const len = no.length;
  if (null !== no && no !== undefined && len >= 11) {
    const char = '*'.repeat(no.length - 9);
    const pat = /(\d{5})\d*(\d{4})/;
    return no.replace(pat, `$1${char}$2`);
  }
  return '';
}

module.exports = {
  formatName,
  formatMobile,
  formatCertificateNo,
};
