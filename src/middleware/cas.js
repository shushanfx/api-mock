const config = require('config');
const AUTH_CONFIG = config.get('auth');

const logger = require('log4js').getLogger('cas');
const ResultInfo = require('../bean/result');

if (AUTH_CONFIG && AUTH_CONFIG.check) {
  const SmartProxy = require('@tencent/smart-proxy');
  SmartProxy.setOptions({
    token: AUTH_CONFIG.token,
    always_auth: true
  })
  const somy = async (ctx, next) => {
    const checkResult = SmartProxy.check((key) => ctx.headers[key]);
    if (checkResult.code === 0) {
      // 成功
      const username = ctx.headers['staffname'];
      const userid = ctx.headers['staffid'];
      ctx.cas = {
        username: username,
        entity: {
          username: username,
          email: `${username}@tencent.com`,
          sn: username,
          gn: username,
          displayName: username,
          userid: userid
        }
      }
      return next();
    } else {
      // 重新登陆
      logger.info("登陆校验失败 %o", checkResult);
      const xRequestedWith = ctx.headers['x-requested-with'];
      if (xRequestedWith && xRequestedWith.toLowerCase() === 'xmlhttprequest') {
        ctx.body = ResultInfo.notAuth();
        return;
      }
      // 重新登陆
      ctx.body = "token过期";
    }
  }
  somy.check = somy;
  module.exports = somy;
} else {
  const somy = async (ctx, next) => {
    ctx.cas = {
      username: 'shushanfx',
      entity: {
        username: 'shushanfx',
        email: 'shushanfx@gmail.com',
        sn: 'shushanfx',
        gn: 'shushanfx',
        department: '蜀山风行工作室',
        displayName: '蜀山风行',
        phone: '185xxxxxxxx'
      }
    }
    await next();
  }
  somy.check = somy;
  module.exports = somy;
}