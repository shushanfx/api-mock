var path = require("path");

var koa = require("koa");
var serve = require("koa-static");
var views = require("koa-views");
var pug = require("pug");
var debug = require("debug")("server.js");
var log4js = require('log4js');
var config = require("config")

var myRouter = require("./src/router");
var app = new koa();
var logger = null;
var port = 0;

log4js.configure({
	appenders: { 'out': { type: 'stdout', layout: { type: 'basic' } } },
	categories: { default: { appenders: ['out'], level: 'info' } }
});
logger = log4js.getLogger("Server");

app.use(serve("assets"));
app.use(views(path.resolve(__dirname, "pug"), {
	extension: "pug",
	engineSource: {
		"pug": async function (fileName, obj) {
			return Promise.resolve().then(function () {
				try {
					return pug.renderFile(fileName, obj);
				}
				catch (e) {
					return Promise.reject(e)
				}
			});
		}
	},
	options: {
		base: config.get("prefix")
	}
}));
myRouter.register(app);
port = config.get("port") || 8000;
app.listen(port, function(){
	logger.info("Server listen on port " + port)
});


