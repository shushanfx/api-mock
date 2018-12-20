var debug = require("debug")("MockMiddleWare");
const querystring = require("querystring");
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
if (!AsyncFunction) {
	AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
}

function handleException(mock, ctx, e) {
	if (e instanceof WrapperError) {
		let status = mock._status;
		if (Wrapper.MESSAGE[status]) {
			ctx.response.body = Wrapper.MESSAGE[status];
		} else {
			ctx.response.body = e.message;
		}
		ctx.response.status = status;
	} else {
		ctx.status = 500;
		ctx.body = ("发生如下错误！\n " + e.message);
		logger.error(e);
	}
}

function createRequestOption(mock, ctx) {
	let protocol = ctx.protocol,
		host = mock && mock.host ? mock.host : ctx.host,
		path = mock && mock.path ? mock.path : ctx.path,
		port = mock && mock.port ? mock.port : ctx.port,
		query = mock && mock.query ? mock.query : ctx.query;

	if (ctx.headers['x-scheme']) {
		protocol = ctx.headers['x-scheme'].trim().replace(/\:/gi, '');
		delete ctx.headers['x-scheme']; // delete x-scheme
	}
	if (ctx.headers['x-forwarded-proto']) {
		protocol = ctx.headers['x-forwarded-proto'].trim().replace(/\:/gi, '');
		delete ctx.headers['x-forwarded-proto']; // delete x-scheme
	}
	let getHost = function () {
		if (protocol === "https") {
			return host + (!port || port == 443 ? "" : (":" + port));
		} else {
			return host + (!port || port == 80 ? "" : (":" + port));
		}
	}
	if (path) {
		path = path.trim();
		if (!path.startsWith("/")) {
			path = "/" + path;
		}
	}
	let buildUrl = function () {
		var arr = [protocol, "://", getHost(),
			path
		];
		if (query) {
			let tmpArray = [];
			Object.keys(query).forEach(key => {
				// discast mock api.
				if (key.startsWith("mock-")) {
					return true;
				}
				tmpArray.push(encodeURIComponent(key) + "=" + encodeURIComponent(query[key] || ""));
			});
			if (tmpArray.length > 0) {
				arr.push("?", tmpArray.join("&"));
			}
		}
		return arr.join("");
	};
	let buildProxy = function (proxy) {
		let arr = /^\s*(([^:]+):\/\/)?([^:\/]+)(:(\d+))?\s*$/gi.exec(proxy);
		if (arr && arr[3]) {
			return (arr[2] || "http") + "://" + arr[3] + (arr[5] && arr[5] != "80" ? (":" + arr[5]) : "");
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
	if (!mock.isNotTunnelHeader && ctx.headers) {
		Object.keys(ctx.headers).forEach(key => {
			// handle cache header.
			if (key === "if-modified-since" || key === "if-none-match") {
				return true;
			}
			options.headers[key] = ctx.headers[key];
		});
	}
	if (mock.isNotRedirect) {
		options.followRedirect = false;
	}
	options.headers["host"] = getHost();
	if (mock.item && mock.item.isProxy && typeof mock.item.proxy === "string") {
		options.proxy = buildProxy(mock.item.proxy);
	}
	if (ctx.method.toLowerCase() in {
			"post": 1,
			"put": 1,
			"patch": 1
		}) {
		options.body = ctx.request.rawBody;
	}
	return options;
}

function getType(type) {
	const MAP = {
		"txt": "text",
		"js": "javascript",
		"htm": "html"
	};
	return MAP[type] || type;
}

function getProjectID(ctx) {
	let projectID = ctx.query.projectID || ctx.query.testID || ctx.query.__pid;
	if (!projectID) {
		let refer = ctx.header['referer'];
		if (refer) {
			let reg = /\?(.+)$/gi;
			let arr = reg.exec(refer);
			if (arr) {
				let str = arr[1];
				let query = querystring.parse(str);
				projectID = query.projectID || query.testID || query.__pid;
			}
		}
	}
	return projectID;
}

module.exports = function () {
	return async function (ctx, next) {
		// 是否找到Middle.
		if (ctx.status == 404) {
			var path = ctx.path,
				host = ctx.hostname,
				port = ctx.port;

			var isWithMockParameter = false;
			var query = ctx.query;

			if (ctx.query["mock-host"]) {
				host = ctx.query["mock-host"];
				isWithMockParameter = true;
			}
			if (ctx.query["mock-port"]) {
				port = ctx.query["mock-port"];
				isWithMockParameter = true;
			}
			if (ctx.query["mock-path"]) {
				path = ctx.query["mock-path"];
				if (path.indexOf("?") != -1) {
					let newPath = path.substring(0, path.indexOf("?"));
					query = merge(true, {}, query,
						querystring.parse(path.substring(path.indexOf("?") + 1)));
					path = newPath;
				}
				isWithMockParameter = true;
			}
			let projectID = getProjectID(ctx);
			let obj = await dao.query(host, port, path, projectID);
			let mock = new Wrapper(ctx);

			mock.port = port;
			mock.path = path;
			mock.host = host;
			mock.query = query;
			mock.projectID = projectID;

			let mockResult = null;
			let mockException = false;
			let mockBeforeFunction = null;
			let mockAfterFunction = null;
			let mockReturnImmediately = false;
			let mockFetchResponse = null;

			if (obj) {
				// found ... 
				ctx.query = query;
				ctx.param = obj.param;
				mock.type = obj.item.type;
				Object.keys(obj).forEach(jtem => {
					mock[jtem] = obj[jtem];
				});

				// mock it.
				mock.cwd = process.cwd();
				mock.merge = merge;
				mock.co = co;
				mock.request = request;
				mock.logger = log4js.getLogger(projectID);
				mock.console = mock.logger;

				if (obj.item.isBefore && obj.item.onBefore) {
					// bofore 任务
					if (!obj.item.__onBefore) {
						obj.item.__onBefore = new AsyncFunction("ctx", "mock",
							`with(mock){ ${obj.item.onBefore} }`);
					}
					mockBeforeFunction = obj.item.__onBefore;
				}
				if (obj.item.isContent && obj.item.content) {
					// from content
					mockResult = obj.item.content;
				}
				if (obj.item.isFilter && obj.item.filter) {
					if (!obj.item.__after) {
						obj.item.__after = new AsyncFunction("ctx", "mock",
							`with(mock){ ${obj.item.filter} }`);
					}
					mockAfterFunction = obj.item.__after;
				}
			}
			let returnValue;
			if (mockBeforeFunction) {
				try {
					returnValue = await mockBeforeFunction.call(mock, ctx, mock);
				} catch (e) {
					mockException = true;
					handleException(mock, ctx, e);
					logger.error(e);
				}
			}
			// before function return false.
			if (returnValue === false) {
				mockException = false;
				mockReturnImmediately = false;
			} else {
				// handle content or from url.
				if (!mockException && mockResult) {
					mock.result = mockResult;
				} else if (!mockResult && !ctx.headers["x-come-from"]) {
					ctx.headers["X-Come-From"] = "Mock";
					let options = createRequestOption(mock, ctx);
					try {
						let response = await request(options);
						if (response) {
							let ext = getType(mimeType.extension(response.headers["content-type"]));
							let charset = mimeType.charset(response.headers["content-type"]);
							mockFetchResponse = response;
							mock.type = ext;
							if (response.statusCode == 200 &&
								(ext === "text" || ext === "html" || ext === "javascript" || ext === "json" ||
									ext === "xml" ||
									ext === "css" || ext === false)) {
								// handle charset.
								if (typeof charset === "string") {
									response.body = iconv.decode(response.body, charset);
									ext = ext === false ? "text" : ext;
									if (ext === "text" || ext === "html" || ext === "javascript") {
										mock.result = jsonUtil.getFromString(response.body);
									} else {
										mock.result = response.body;
									}
								} else {
									// 直接返回
									mockReturnImmediately = true;
								}
							} else {
								// return immediately
								mockReturnImmediately = true;
							}
						} else {
							// 没有返回东西
							mockException = true;
						}
					} catch (e) {
						mockException = true;
						logger.error(`Fetch error from url: ${options.url} with code ${e.statusCode}`);
						ctx.status = e.statusCode || 500;
						let message = e.message;
						if (e.response && e.response.body) {
							message = e.response.body;
							if (message instanceof Buffer) {
								let charset = mimeType.charset(e.response.headers["content-type"]) || "utf-8";
								try {
									message = iconv.decode(message, charset);
								} catch (e1) {
									message = null;
									logger.error(e1);
								}
							}
						}
						ctx.body = message || "Server Inner Error";
					}
				} else {
					// not found
					mockException = true;
				}
				if (!mockReturnImmediately && !mockException && mockAfterFunction) {
					try {
						if (jsonUtil.isJSON(mock.result)) {
							mock.result = (new Function(`try{ return (${mock.result});} catch(e){return {};}`))();
						}
						await mockAfterFunction.call(mock, ctx, mock);
					} catch (e) {
						// error in execute.
						mockException = true;
						handleException(mock, ctx, e);
						logger.error(e);
					}
				}
				if (!mockException && mockFetchResponse) {
					let headers = mockFetchResponse.headers;
					if (headers) {
						Object.keys(headers).forEach(key => {
							if (key === "content-encoding" && typeof headers[key] === "string") {
								// 去掉gzip压缩的情况
								return;
							} else if (key === "transfer-encoding") {
								return;
							}
							if (!mockReturnImmediately) {
								if (key === "content-length") {
									return;
								}
							}
							ctx.append(key, headers[key]);
						});
					}
					if (mockReturnImmediately) {
						ctx.status = mockFetchResponse.statusCode || "200";
						ctx.body = mockFetchResponse.body;
					}
				}
			}
			if (!mockException && !mockReturnImmediately && mock.result) {
				let interceptors = [];
				let proxy = 'none';
				if (mockBeforeFunction) {
					interceptors.push('Before');
				}
				if (mockResult) {
					interceptors.push('Content');
				}
				if (mock.isProxy && mock.proxy) {
					proxy = mock.proxy || 'none';
					interceptors.push('Proxy');
				}
				if (mock.mockAfterFunction) {
					interceptors.push('After')
				}
				ctx.append('X-Mock-Interceptor', interceptors.join(','))
				ctx.append('X-Mock-Intercept-By-Before', returnValue === false);
				ctx.append('X-Mock-Proxy', encodeURIComponent(proxy));
				renderToBody(ctx, mock);
			}
			mock.mockBeforeFunction = mockBeforeFunction;
			mock.mockBeforeReturn = returnValue;
			mock.mockContent = mockResult;
			mock.mockAfterFunction = mockAfterFunction;
			mock.mockException = mockException;

			printLog(mock, ctx);
		}
		await next();
	}
}

function printLog(mock, ctx) {
	let options = createRequestOption(mock, ctx);
	let proxy = options && options.proxy ? options.proxy : 'none';
	let isBlock = mock.mockBeforeReturn === false;

	let id = mock.item && mock.item._id ? mock.item._id : '';

	logger.info(`[${options.method}] ${ctx.status} "${options.url}" _id:${id} projectID:${mock.projectID} mockBefore:${!!mock.mockBeforeFunction} mockBeforeBlock:${isBlock} mockContent:${!!mock.mockContent} mockAfter:${!!mock.mockAfterFunction} mockProxy:${proxy}`);
}

function renderToBody(ctx, obj) {
	var item = obj.item;
	var mock = obj;
	var type = obj.type || item.type || "json";
	var callback = obj.query["callback"];
	var result = obj.result || "";
	if (ctx.state.isSet) {
		return;
	}
	if (type === "html") {
		// insert js to html
		result = result + `<script type="text/javascript">
			(function(){
				var projectID = "${mock.projectID}";
				var proxy = "${mock.isProxy ? mock.proxy: ''}";
				var str = '<p>projectID: ${mock.projectID}</p>';
				if(proxy){
					str = '<p>${mock.proxy}</p>';
				}
				var aDiv = document.createElement('div');
				aDiv.setAttribute('style', 'padding: 10px 20px 10px; position:fixed; bottom: 20px; right: 20px; background-color: blue; font-size: 20px; z-index: 99999; color: white;');
				aDiv.innerHTML = str;
				document.body.appendChild(aDiv);
				setTimeout(function(){
					aDiv.style.display = 'none';
				}, 10000);
			})();
		</script>`;
	}
	if (callback) {
		// jsonp
		ctx.type = "js";
		switch (type) {
			case "xml":
			case "html":
			case "text":
				result = result.replace(/\'/g, '\\\'').replace(/\n/g, "").replace(/\r/g, "");
				ctx.body = ["try{\n\t", callback, "('", result, "');\n}catch(e){}"].join("");
				break;
			default:
				ctx.body = ["try{\n\t", callback, "(", typeof (result) === "object" ? JSON.stringify(result, null, 4) : result, ");\n}catch(e){}"].join("");
		}
	} else {
		switch (type) {
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
				ctx.body = typeof (result) === "object" ? JSON.stringify(result, null, 4) : result;
		}
	}

}