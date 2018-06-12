var path = require("path");
var http = require("http");

var koa = require("koa");
var serve = require("koa-static");
var views = require("koa-views");
var bodyParser = require("koa-bodyparser");
var pug = require("pug");
var debug = require("debug")("server.js");
var log4js = require('log4js');
var config = require("config");

var myRouter = require("./src/router");
var myUtil = require("./src/util");
var mySocket = require("./src/socket");
var app = new koa();
var logger = null;
var port = 0;

log4js.configure({
	appenders: { 'out': { type: 'stdout', layout: { type: 'basic' } } },
	categories: { default: { appenders: ['out'], level: 'info' } }
});
logger = log4js.getLogger("Server");

app.use(bodyParser());
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
		prefix: config.get("prefix"),
		suffix: config.get("suffix"),
		mock: {
			"uri": function(uri, withoutSuffix){
				return myUtil.uri(uri, withoutSuffix);	
			}
		}
	}
}));
myRouter.register(app);
port = config.get("port") || 8000;

const server = http.Server(app.callback());
mySocket.init(server);
server.listen(port, function(){
	logger.info("Server listen on port " + port)
});


