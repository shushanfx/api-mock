var path = require("path");
var http = require("http");

var Koa = require("koa");
var views = require("koa-views");
var pug = require("pug");
var log4js = require('log4js');
var config = require("config");

var app = new Koa();
var logger = null;
var port = 0;

log4js.configure(config.get("logger"));
logger = log4js.getLogger("Server");

const myRouter = require("./src/router");
const myUtil = require("./src/util");
const mySocket = require("./src/socket");

app.use(views(path.resolve(__dirname, "pug"), {
  extension: "pug",
  engineSource: {
    "pug": async function (fileName, obj) {
      return Promise.resolve().then(function () {
        try {
          return pug.renderFile(fileName, obj);
        } catch (e) {
          return Promise.reject(e)
        }
      });
    }
  },
  options: {
    prefix: config.get("prefix"),
    suffix: config.get("suffix"),
    mock: {
      "uri": function (uri, withoutSuffix) {
        return myUtil.uri(uri, withoutSuffix);
      }
    }
  }
}));
myRouter.register(app);
port = config.get("port") || 8000;

const server = http.Server(app.callback());
mySocket.init(server);
server.listen(port, function () {
  logger.info("Server listen on port " + port)
});