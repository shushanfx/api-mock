var debug = require("debug")("MockMiddleWare");
var querystring = require("querystring");
var merge = require("merge");
var co = require("co")
var request = require("request-promise");
var log4js = require("log4js");
var mimeType = require("mime-types");
var iconv = require('iconv-lite');

var Wrapper = require("./bean/wrapper");
var WrapperError = require("./bean/wrapperError");
var dao = require("./dao/dao");
var jsonUtil = require("./util/json");

var logger = log4js.getLogger("MockMiddle");

var AsyncFunction = global.AsyncFunction;
if(!AsyncFunction){
	AsyncFunction = Object.getPrototypeOf(async function() {} ).constructor;
}

function handleException(mock, ctx, e){
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
		ctx.status = 500;
		ctx.body = ("发生如下错误！\n " + e.message);
		logger.error(e);
	}
}

function createRequestOption(mock, ctx){
	let protocol = ctx.protocol,
		host = mock && mock.host ? mock.host : ctx.host,
		path = mock && mock.path ? mock.path : ctx.path,
		port = mock && mock.port ? mock.port : ctx.port,
		query = mock && mock.query ? mock.query : ctx.query;
	let buildUrl = function(){
		var arr = [protocol, "://", host, port == "80" ? "" : (":" + port),
					path];
		if(query){
			let tmpArray = [];
			Object.keys(query).forEach(key => {
				// discast mock api.
				if(key.startsWith("mock-")){
					return true;
				}
				tmpArray.push(encodeURIComponent(key) + "=" + encodeURIComponent(query[key] || ""));
			});
			if(tmpArray.length > 0){
				arr.push("?", tmpArray.join("&"));
			}
		}
		return arr.join("");
	};
	let buildProxy = function(proxy){
		let arr = /^\s*(([^:]+):\/\/)?([^:\/]+)(:(\d+))?\s*$/gi.exec(proxy);
		if(arr && arr[3]){
			return (arr[2] || "http") + "://" + arr[3] + ( arr[5] && arr[5] != "80" ? (":" + arr[5]) : "" );
		}
	};
	let options = {
		url: buildUrl(protocol, host, path, port, query),
		method: ctx.method,
		resolveWithFullResponse: true,
		encoding: null,
		gzip: true
	};
	options.headers = {};
	if(ctx.headers){
		Object.keys(ctx.headers).forEach(key => {
			// handle cache header.
			if(key === "if-modified-since" || key === "if-none-match"){
				return true;
			}
			options.headers[key] = ctx.headers[key];
		});
	}
	options.headers["host"] = host + (port == 80 ? "" : (":" + port));
	if(mock.item && mock.item.isProxy && typeof mock.item.proxy === "string"){
		options.proxy = buildProxy(mock.item.proxy);
	}
	if(ctx.method.toLowerCase() in 
		{"post": 1, "put": 1, "patch": 1}){
		options.body = ctx.request.rawBody;
	}
	return options;
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
			let mock = new Wrapper(ctx);

			mock.port = port;
			mock.path = path;
			mock.host = host;
			mock.query = query;

			let mockResult = null;
			let mockException = false;
			let mockBeforeFunction = null;
			let mockAfterFunction = null;
			let mockReturnImmediately = false;
			let mockFetchResponse = null;

			if(obj){
				// found ... 
				ctx.query = query;
				ctx.param = obj.param;
				mock.type = obj.item.type;

				Object.keys(obj).forEach(jtem => {
					mock[jtem] = obj[jtem];
				});

				// mock it.
				mock.require = require;
				mock.cwd = process.cwd();
				mock.merge = merge;
				mock.co = co;
				mock.request = request;

				if(obj.item.isBefore && obj.item.onBefore){
					// bofore 任务
					if(! obj.item.__onBefore){
						obj.item.__onBefore = new AsyncFunction("ctx", "mock", 
						`with(mock){ ${obj.item.onBefore} }`);
					}
					mockBeforeFunction = obj.item.__onBefore;
				}
				if(obj.item.isContent && obj.item.content){
					// from content
					mockResult = obj.item.content;
				}
				// after function.
				if(obj.item.isFilter && obj.item.filter){
					if(! obj.item.__after){
						obj.item.__after = new AsyncFunction("ctx", "mock", 
							`with(mock){ ${obj.item.filter} }`);
					}
					mockAfterFunction = obj.item.__after;
				}
			}
			if(mockBeforeFunction){
				try{	
					await mockBeforeFunction.call(mock, ctx, mock);
				}
				catch(e){
					mockException = true;
					handleException(mock, ctx, e);
				}
			}
			// handle content or from url.
			if(!mockException && mockResult){
				mock.result = mockResult;
			}
			else if(!mockResult && !ctx.headers["x-come-from"]){
				ctx.headers["X-Come-From"] = "Mock";
				let options = createRequestOption(mock, ctx);
				let proxy = options.proxy || "none";
				logger.info(`${options.method} -> ${options.url} with proxy: ${proxy}`);
				try {
					let response = await request(options);
					if(response){
						let ext = mimeType.extension(response.headers["content-type"]);
						let charset = mimeType.charset(response.headers["content-type"]);
						mockFetchResponse = response;
						if(mockAfterFunction && response.statusCode == 200
							&& (ext === "txt" || ext === "html" || ext === "js" || ext === "json"
							|| ext === "xml"
							|| ext === "css" || ext === false)){
							// handle charset.
							if(typeof charset === "string"){
								response.body = iconv.decode(response.body, charset);
								ext = ext === false ? "txt" : ext; 
								if(ext === "txt" || ext === "html" || ext === "js"){
									mock.result = jsonUtil.getFromString(response.body);
								}
								else{
									mock.result = response.body;
								}								
							}
							else{
								// 直接返回
								mockReturnImmediately = true;	
							}
						}
						else{
							// return immediately
							mockReturnImmediately = true;
						}
					}
					else{
						// 没有返回东西
						mockException = true;
					}
				} catch(e){
					mockException = true;
					logger.error(`Fetch error from url: ${options.url} with code ${e.statusCode} and  message ${e.message}`);
					ctx.status = e.statusCode || 500;
					let message = e.message;
					if(typeof e.message != "string"){
						try{	
							message = iconv.decode(message, "UTF-8");
						} catch(e1){
							message = null;
							logger.error(e1);
						}
					}
					ctx.body = message || "Server Inner Error";
				}
			}
			else{
				// not found
				mockException = true;
			}

			if(!mockReturnImmediately && !mockException && mockAfterFunction){
				try{
					if(jsonUtil.isJSON(mock.result)){
						mock.result = (new Function(`try{ return (${mock.result});} catch(e){return {};}`))();
					}
					await mockAfterFunction.call(mock, ctx, mock);
				}
				catch(e){
					// error in execute.
					mockException = true;
					handleException(mock, ctx, e);
					logger.error(e);
				}
			}
			if(!mockException && mockFetchResponse){
				let headers = mockFetchResponse.headers;
				if(headers){
					Object.keys(headers).forEach(key => {
						if(key === "content-encoding" && typeof headers[key] === "string"){
							// 去掉gzip压缩的情况
							return ;	
						}
						else if(key === "transfer-encoding"){
							return ;
						}
						if(!mockReturnImmediately){
							if(key === "content-length"){
								return ;
							}							
						}
						ctx.set(key, headers[key]);
					});
				}
				if(mockReturnImmediately){
					ctx.status = mockFetchResponse.statusCode || "200";	
					ctx.body = mockFetchResponse.body;
					// ctx.body = ctx.req.pipe(mockFetchResponse);
					// mockFetchResponse.pipe(ctx.res);
					// mockFetchResponse.req.pipe(ctx.res);
				}
			}
			if(!mockException && !mockReturnImmediately && mock.result){
				renderToBody(ctx, mock);
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