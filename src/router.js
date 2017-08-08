var path = require("path");

var glob = require("glob")
var KoaRouter = require("koa-router");
var log4js = require("log4js");
var stringFormat = require("string-format");
var config = require("config");

var Wrapper = require("./bean/wrapper");
var MyRouter = require("./router/index.js");
var MyDao = require("./dao/dao.js");


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
	app.use(Wrapper.use());
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
							if (typeof options.method == "string"
								&& ALLOW_METHOD[options.method]) {
								router[options.method](key, options.handler);
							}
							else {
								router.get(key, options.handler);
							}
							logger.info(stringFormat("Register mapper for {} with method {}.", key, options.method || "get"));
						}
					});
					app.use(router.routes())
						.use(router.allowedMethods());;
				}
			}
		} catch (e) {
			logger.error(e);
		}
	});
	// app.use(async function (ctx, next) {
	// 	var wrapper = ctx.wrapper;
	// 	wrapper.notFound(30);
	// 	wrapper.serverException(20);
	// 	await wrapper.delay(2000);
	// 	await wrapper.delay(2000, 20);
	// 	await wrapper.delay(2000, 30);

	// 	// ctx.body = "Test Succsss";
	// 	await next();
	// });
}
