const KoaRouter = require("koa-router");
const log4js = require("log4js");
const config = require("config");

const MyRouter = require("./router/index.js");
const MyDao = require("./dao/dao.js");
const MyMock = require("./mockMiddle");
const FileServe = require("koa2-file-middle");
const cas = require('./middleware/cas');
var koaBody = require("koa-body");

const logger = log4js.getLogger("Router");

const ALLOW_METHOD = {
  "get": 1,
  "post": 1,
  "put": 1,
  "delete": 1,
  "del": 1,
  "all": 1,
  "options": 1,
  "patch": 1
}

exports.register = function register(app) {
  MyDao.init();
  app.use(FileServe(["assets", "static"], {
    prefix: config.get("prefix"),
    cachedPath: false
  }));
  let router = new KoaRouter();
  router.all('/mock/**', koaBody(), cas, async (ctx, next) => {
    let start = Date.now();
    try {
      await next();
    } catch (e) {
      logger.error(e);
      ctx.status = 500;
      ctx.body = e.message;
    }
    let delta = Date.now() - start;
    logger.info(`[API-MOCK-BACKGROUND] ${ctx.method} ${ctx.status} [${ctx.path}] cost=${delta}`);
  });
  app.use(router.routes())
    .use(router.allowedMethods());
  let list = MyRouter;
  list.forEach(item => {
    try {
      let map = {};
      let Class = item;
      if (Class) {
        let ins = new Class(map);
        ins.init();
        let keys = Object.keys(ins.map);
        if (keys.length > 0) {
          let router = new KoaRouter();
          keys.forEach(key => {
            let options = ins.map[key];
            if (typeof options === "object" && options.handler) {
              logger.debug("Register mapper for " + key);
              if (typeof options.method == "string" &&
                ALLOW_METHOD[options.method]) {
                router[options.method](key, cas.check, options.handler);
              } else {
                router.get(key, cas.check, options.handler);
              }
              logger.info("Register mapper for %s with method %s.", key, options.method || "get");
            }
          });
          router.use(cas.check);
          app.use(router.routes())
            .use(router.allowedMethods());
        }
      }
    } catch (e) {
      logger.error(e);
    }
  });
  app.use(MyMock());
}