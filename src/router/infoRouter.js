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
    });
  }
}

module.exports = exports = IndexRouter;