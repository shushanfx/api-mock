var path = require("path");

var glob = require("glob")
var KoaRouter = require("koa-router");
var log4js = require("log4js");
var stringFormat = require("string-format");
var config = require("config");

var MyRouter = require("./router/index.js");
var MyDao = require("./dao/dao.js");
var MyMock = require("./mockMiddle");
// var FileServe = require("./fileMiddle");
var FileServe = require("koa2-file-middle");
const cas = require('./middleware/cas');

var logger = log4js.getLogger("Router");

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
	app.use(cas);
	let list = MyRouter;
	list.forEach(item => {
		try {
			let map = new Object(null);
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
								router[options.method](key, options.handler);
							} else {
								router.get(key, options.handler);
							}
							logger.info(stringFormat("Register mapper for {} with method {}.", key, options.method || "get"));
						}
					});
					router.use(cas.check);
					router.use(async (ctx, next) => {
						let start = Date.now();
						try {
							await next();
						} catch (e) {
							logger.error(e);
							ctx.status = 500;
							ctx.body = e.message;
						}
						let delta = Date.now() - start;
						console.info(delta);
						logger.info(`[API-MOCK-BACKGROUND] ${ctx.method} ${ctx.status} [${ctx.path}] cost=${delta}`);
					});
					app.use(router.routes())
						.use(router.allowedMethods());;
				}
			}
		} catch (e) {
			logger.error(e);
		}
	});
	app.use(MyMock());
}