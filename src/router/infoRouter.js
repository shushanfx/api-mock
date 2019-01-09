const ipUtils = require('../util/ip');
const AbstractRouter = require("../abstractRouter");
const Result = require('../bean/result');

class IndexRouter extends AbstractRouter {
  init() {
    this.json("cas/info", async function (ctx) {
      if (ctx.cas) {
        let result = Result.success('获取用户信息成功', ctx.cas);
        ctx.body = result;
      } else {
        ctx.body = Result.fail('获取用户信息失败');
      }
    }).json("cas/ip", async function (ctx) {
      let ip = ipUtils.getClientIP(ctx);
      if (ip != "none") {
        ctx.body = Result.success(null, ip);
      } else {
        ctx.body = Result.fail("获取失败", ip);
      }
    });
  }
}

module.exports = exports = IndexRouter;