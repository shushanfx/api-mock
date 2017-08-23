var debug = require("debug")("MockMiddleWare");
var querystring = require("querystring");
var merge = require("merge");
var co = require("co")
var request = require("request-promise");
var log4js = require("log4js");

var Wrapper = require("./bean/wrapper");
var WrapperError = require("./bean/wrapperError");
var dao = require("./dao/dao");
var logger = log4js.getLogger("MockMiddle");

var AsyncFunction = global.AsyncFunction;
if(!AsyncFunction){
	AsyncFunction = Object.getPrototypeOf(async function() {} ).constructor;
}

module.exports = function(){
	return async function(ctx, next){
		// 是否找到Middle.
		if(ctx.status == 404){
			var path = ctx.path,
				host = ctx.hostname,
				port = ctx.port;
			
			var isWithMockParameter = false;
			var query = ctx.query;
			if(ctx.query["mock-host"]){
				host = ctx.query["mock-host"];
				isWithMockParameter = true;
			}
			if(ctx.query["mock-port"]){
				port = ctx.query["mock-port"];
				isWithMockParameter = true;
			}
			if(ctx.query["mock-path"]){
				path = ctx.query["mock-path"];
				if(path.indexOf("?")!=-1){
					let newPath = path.substring(0, path.indexOf("?"));
					query = merge(true, {}, query, 
							querystring.parse(path.substring(path.indexOf("?") + 1)));
					path = newPath;
				}
				isWithMockParameter = true;
			}
			port = port || 80;
			let obj = await dao.query(host, port, path);
			if(obj){
				// found ... 
				obj.query = query;
				obj.result = obj.item.content;
				let mock = new Wrapper(ctx);
				ctx.query = query;
				ctx.param = obj.param;
				Object.keys(obj).forEach(jtem => {
					mock[jtem] = obj[jtem];
				});
				mock.require = require;
				mock.cwd = process.cwd();
				mock.merge = merge;
				mock.co = co;
				mock.request = request;

				// check whether filter is open.
				if(obj.item.isFilter && obj.item.filter){
					if(! obj.item.__filter){
						obj.item.__filter = new AsyncFunction("ctx", "mock", 
							`with(mock){ ${obj.item.filter} }`);
					}
					if(obj.item.__filter){
						try{	
							if(obj.item.type == "json"){
								if(obj.result){
									mock.result = (new Function(`try{ return (${obj.result});} catch(e){return {};}`))();
								}
								else{
									mock.result = {};
								}
							}
							await obj.item.__filter.call(mock, ctx, mock);
						}
						catch(e){
							// error in execute.
							if (e instanceof WrapperError) {
								let status = mock._status;
								if (Wrapper.MESSAGE[status]) {
									ctx.response.body = Wrapper.MESSAGE[status];
								}
								else {
									ctx.response.body = e.message;
								}
								ctx.response.status = status;
							}
							else{
								if(ctx.state){
									ctx.state.isSet = true;
								}
								else{
									ctx.state = {isSet : true};
								}
								ctx.status = 500;
								ctx.message = e.message;
								ctx.body = "发生如下错误！\n " + e.message;
								logger.error(e);
							}
						}
					}
				}
				renderToBody(ctx, mock);
			}
			else if(!isWithMockParameter && !ctx.headers["x-come-from"]){
				// try to fetch from online.
				ctx.headers["X-Come-From"] = "Mock";
				let options = {
					url: `${ctx.protocol}://${ctx.host}${ctx.url}`,
					method: ctx.method,
					headers: ctx.headers
				};
				if(ctx.method.toLowerCase() in 
					{"post": 1, "put": 1, "patch": 1}){
					options.body = ctx.request.rawBody;
				}
				try {
					let result = await request(options)
					renderToBody(ctx, {
						query: ctx.query,
						item: {
							result	
						}
					});
				} catch(e){
					logger.error(`Fetch error from url: ${options.url} with code ${e.statusCode} and  message ${e.message}`);
					ctx.response.status = e.statusCode || 500;
					ctx.response.body = e.message || "Server Inner Error";
				}
			}
		}
		await next();
	}
}

function renderToBody(ctx, obj){
	var item = obj.item;
	var type = typeof item.type === "string" ? item.type.toLowerCase() : "json";
	var callback = obj.query["callback"];
	var result = obj.result || "";
	if(ctx.state.isSet){
		return ;
	}
	if(callback){
		// jsonp
		ctx.type = "js";
		switch(type) {
			case "xml": 
			case "html":
			case "text":
				result = result.replace(/\'/g, '\\\'').replace(/\n/g, "").replace(/\r/g, "");
				ctx.body = ["try{\n\t", callback, "('", result, "');\n}catch(e){}"].join("");
				break;
			default:
				ctx.body = ["try{\n\t", callback, "(", typeof(result) === "object" ? JSON.stringify(result, null, 4) : result, ");\n}catch(e){}"].join("");
		}
	}
	else{
		switch (type){
			case "xml":
			case "html":
			case "text":
				ctx.type = type;
				ctx.body = result;
				break;
			case "javascript":
				ctx.type = "js";
				ctx.body = result;
			default:
				ctx.type = "json";
				ctx.body = typeof(result) === "object" ? JSON.stringify(result, null, 4) : result;
		}		
	}

}