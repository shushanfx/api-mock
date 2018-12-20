const config = require('config');
const AUTH_CONFIG = config.get('auth');

const logger = require('log4js').getLogger('cas');

if (AUTH_CONFIG && AUTH_CONFIG.check) {
  const SomyCas = require('somy-koa-md-cas');
  const somy = SomyCas(Object.assign({
    logger: logger
  }, AUTH_CONFIG));
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