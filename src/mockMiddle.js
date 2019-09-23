const querystring = require('querystring');
var merge = require('merge');
var co = require('co');
var request = require('request');
var log4js = require('log4js');
var mimeType = require('mime-types');
var iconv = require('iconv-lite');
const isHTML = require('is-html');
const config = require('config');

var Wrapper = require('./bean/wrapper');
var WrapperError = require('./bean/wrapperError');
var dao = require('./dao/dao');
var jsonUtil = require('./util/json');

var logger = log4js.getLogger('MockMiddle');
const urlencode = require('urlencode');
const isIp = require('is-ip');
const parseDomain = require('parse-domain');
const ipUtils = require('./util/ip');
const isFollowRedirect = config.has("request.followRedirect");

var AsyncFunction = global.AsyncFunction;
if (!AsyncFunction) {
  AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
}

function loggerError(logger, error) {
  let stack = error ? error.stack : null;
  if (stack) {
    let arr = stack.split('\n');
    arr.forEach(item => {
      logger.error(item);
    });
  }
}

function wrapRequestBody(ctx, options, logger) {
  let type = ctx.header['content-type'];
  if (type && typeof type === 'string') {
    try {
      let charset = ctx.request.charset || 'utf8';
      if (ctx.is('json')) {
        options.body = ctx.request.body;
        options.json = true;
      } else {
        if (typeof ctx.request.body === 'object') {
          let arr = [];
          for (let key in ctx.request.body) {
            let value = ctx.request.body[key];
            if (typeof value === 'object') {
              value = JSON.stringify(value);
            }
            arr.push(
              urlencode(key || '', charset) +
              '=' +
              urlencode(value || '', charset)
            );
          }
          options.body = arr.join('&');
          options.headers['content-type'] =
            'application/x-www-form-urlencoded;charset=' + charset;
        } else {
          options.pipe = true;
        }
      }
    } catch (e) {
      loggerError(logger, e);
    }
  }
}

function createRequestOption(mock, ctx) {
  let protocol = mock && mock.protocol ? mock.protocol : (ctx.protocol || "http");
  let host = mock && mock.host ? mock.host : ctx.host;
  let path = mock && mock.path ? mock.path : ctx.path;
  let port = mock && mock.port ? mock.port : ctx.port;
  let query = mock && mock.query ? mock.query : ctx.query;
  let getHost = function () {
    if (protocol === 'https') {
      return host + (!port || port == 443 ? '' : ':' + port);
    } else {
      return host + (!port || port == 80 ? '' : ':' + port);
    }
  };
  if (path) {
    path = path.trim();
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
  }
  let buildUrl = function () {
    var arr = [protocol, '://', getHost(), path];
    if (query) {
      let tmpArray = [];
      Object.keys(query).forEach(key => {
        // discast mock api.
        if (key.startsWith('mock-')) {
          return true;
        }
        tmpArray.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(query[key] || '')
        );
      });
      if (tmpArray.length > 0) {
        arr.push('?', tmpArray.join('&'));
      }
    }
    return arr.join('');
  };
  let buildProxy = function (proxy) {
    let arr = /^\s*(([^:]+):\/\/)?([^:/]+)(:(\d+))?\s*$/gi.exec(proxy);
    if (arr && arr[3]) {
      return (
        (arr[2] || 'http') +
        '://' +
        arr[3] +
        (arr[5] && arr[5] != '80' ? ':' + arr[5] : '')
      );
    }
  };
  let options = {
    url: buildUrl(protocol, host, path, port, query),
    method: ctx.method,
    resolveWithFullResponse: true,
    encoding: null,
    gzip: true,
    headers: {
      'X-Come-From': 'Mock'
    }
  };
  if (!mock.isNotTunnelHeader && ctx.headers) {
    Object.keys(ctx.headers).forEach(key => {
      // handle cache header.
      if (key === 'if-modified-since' || key === 'if-none-match') {
        return true;
      }
      options.headers[key] = ctx.headers[key];
    });
  }
  if (mock.item && mock.item.isNotRedirect) {
    options.followRedirect = false;
  } else {
    options.followRedirect = isFollowRedirect;
  }
  options.headers['host'] = getHost();
  if (mock.item && mock.item.isProxy && typeof mock.item.proxy === 'string') {
    let proxyURL = buildProxy(mock.item.proxy);
    options.url = options.url.replace(/https?:\/\/[^/]+/gi, proxyURL);
  }
  if (
    ctx.method.toLowerCase() in {
      post: 1,
      put: 1,
      patch: 1
    }
  ) {
    wrapRequestBody(ctx, options, mock.logger);
  }
  return options;
}

function getType(type) {
  const MAP = {
    txt: 'text',
    js: 'javascript',
    htm: 'html'
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
  if (!projectID) {
    let cookies = ctx.cookies;
    projectID =
      cookies.get('projectID') || cookies.get('testID') || cookies.get('__pid');
  }
  if (!projectID) {
    projectID =
      ctx.header['x-mock-projectid'] ||
      ctx.header['x-mock-testid'] ||
      ctx.header['x-mock-pid'];
  }
  return projectID;
}

function requestPromise(options, ctx) {
  return new Promise(resolve => {
    let isPipe = false;
    if (options.pipe) {
      delete options.pipe;
    }
    let req = request(options, (err, res, body) => {
      if (err) {
        throw err;
      } else if (res) {
        res.body = body;
        resolve(res);
      } else {
        throw new Error("Invalid body.");
      }
    });
    if (isPipe) {
      req.pipe(ctx.req);
    }
  })
}

module.exports = function () {
  return async function (ctx, next) {
    // 是否找到Middle.
    if (ctx.status == 404) {
      let path = ctx.path;
      let host = ctx.hostname;
      let port = ctx.port;
      let query = ctx.query;
      let protocol = ctx.protocol;
      if (ctx.headers['x-scheme']) {
        protocol = ctx.headers['x-scheme'].trim().replace(/:/gi, '');
        delete ctx.headers['x-scheme']; // delete x-scheme
      }
      if (ctx.headers['x-forwarded-proto']) {
        protocol = ctx.headers['x-forwarded-proto'].trim().replace(/:/gi, '');
        delete ctx.headers['x-forwarded-proto']; // delete x-forwarded-proto
      }
      if (ctx.query['mock-host']) {
        host = ctx.query['mock-host'];
      }
      if (ctx.query['mock-port']) {
        port = ctx.query['mock-port'];
      }
      if (ctx.query['mock-path']) {
        path = ctx.query['mock-path'];
        if (path.indexOf('?') != -1) {
          let newPath = path.substring(0, path.indexOf('?'));
          query = merge(
            true, {},
            query,
            querystring.parse(path.substring(path.indexOf('?') + 1))
          );
          path = newPath;
        }
      }
      if (ctx.query['mock-protocol'] || ctx.query['mock-scheme']) {
        protocol = ctx.query['mock-protocol'] || ctx.query['mock-scheme'];
      }
      let projectID = getProjectID(ctx);
      let matchedMock = await dao.query(host, port, path, projectID);

      let mock = new Wrapper(ctx);
      mock.isRefer = !!ctx.header['referer'];
      mock.port = port;
      mock.path = path;
      mock.host = host;
      mock.query = query;
      mock.protocol = protocol || 'http';
      mock.projectID = projectID;
      mock.logger = log4js.getLogger(projectID);
      mock.console = mock.logger;
      mock.start = Date.now();
      // mock it.
      mock.cwd = process.cwd();
      mock.merge = merge;
      mock.co = co;
      mock.request = request;
      mock.str2json = jsonUtil.getFromString;

      let lastStatus = 200;
      let lastResult = null;
      let lastMockRule = null;
      let mockException = false;
      let mockExceptionInstance = null;
      let mockReturnImmediately = false;
      let mockFetchResponse = null;

      if (!matchedMock || !matchedMock.length) {
        matchedMock = [null];
      }

      for (let i = 0; i < matchedMock.length; i++) {
        let obj = matchedMock[i];
        let mockResult = null;
        let mockBeforeFunction = null;
        let mockBeforeRequestFunction = null;
        let mockAfterFunction = null;
        let returnValue = null;

        mockException = false;
        mockExceptionInstance = null;
        mockReturnImmediately = false;
        mockFetchResponse = null;

        if (obj) {
          // found ...
          ctx.query = query;
          ctx.param = obj.param;
          mock.type = obj.item.type;
          Object.keys(obj).forEach(jtem => {
            mock[jtem] = obj[jtem];
          });
          if (obj.item.isBefore && obj.item.onBefore) {
            // bofore 任务
            if (!obj.item.__onBefore) {
              obj.item.__onBefore = new AsyncFunction(
                'ctx',
                'mock',
                `with(mock){ ${obj.item.onBefore} }`
              );
            }
            mockBeforeFunction = obj.item.__onBefore;
          }
          if (obj.item.isContent && obj.item.content) {
            // from content
            mockResult = obj.item.content;
          }
          if (obj.item.isBeforeRequest && obj.item.onBeforeRequest) {
            if (!obj.item.__onBeforeRequest) {
              obj.item.__onBeforeRequest = new AsyncFunction(
                'ctx',
                'mock',
                'options',
                `with(mock){ ${obj.item.onBeforeRequest} }`
              );
            }
            mockBeforeRequestFunction = obj.item.__onBeforeRequest;
          }
          if (obj.item.isFilter && obj.item.filter) {
            if (!obj.item.__after) {
              obj.item.__after = new AsyncFunction(
                'ctx',
                'mock',
                `with(mock){ ${obj.item.filter} }`
              );
            }
            mockAfterFunction = obj.item.__after;
          }
          lastMockRule = obj;
        }
        if (mockBeforeFunction) {
          try {
            returnValue = await mockBeforeFunction.call(mock, ctx, mock);
          } catch (e) {
            mockException = true;
            mockExceptionInstance = e;
            loggerError(mock.logger, e);
          }
        }
        if (returnValue === false) {
          // 拦截了
          if (mock.result) {
            lastResult = mock.result;
          } else {
            continue;
          }
        } else if (mockException) {
          // mock 返回异常
          if (mockExceptionInstance instanceof WrapperError) {
            // mock返回不做任何处理
          } else {
            continue;
          }
        } else {
          if (mockResult) {
            lastResult = mock.result;
          } else if (!ctx.headers['x-come-from']) {
            let options = createRequestOption(mock, ctx);
            mock.requestOptions = options;
            logger.debug('%s url: %s', options.method || 'get', options.url);
            try {
              if (mockBeforeRequestFunction) {
                await mockBeforeRequestFunction.call(mock, ctx, mock, options);
              }
              let response = await requestPromise(options, ctx);
              logger.debug('Request option: %o', options);
              if (response) {
                let ext = getType(
                  mimeType.extension(response.headers['content-type'])
                );
                let charset = mimeType.charset(response.headers['content-type']);
                mockFetchResponse = response;
                mock.type = ext;
                if (
                  response.statusCode == 200 &&
                  (ext === 'text' ||
                    ext === 'html' ||
                    ext === 'javascript' ||
                    ext === 'json' ||
                    ext === 'xml' ||
                    ext === 'css' ||
                    ext === false)
                ) {
                  // handle charset.
                  if (typeof charset === 'string') {
                    if (Buffer.isBuffer(response.body)) {
                      response.body = iconv.decode(response.body, charset);
                    }
                    ext = ext === false ? 'text' : ext;
                    mock.result = response.body;
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
              mock.logger.error(
                `Fetch error from url: ${options.url} with code ${e.statusCode}`
              );
              let status = e.statusCode || 500;
              if (i < matchedMock.length - 1) {
                if (status >= 400 && status < 599) {
                  // 返回数据失败
                  continue;
                }
              }
              lastStatus = status;
              let message = e.message;
              if (e.response) {
                message = e.response.body;
                if (message instanceof Buffer) {
                  let charset =
                    mimeType.charset(e.response.headers['content-type']) ||
                    'utf-8';
                  try {
                    message = iconv.decode(message, charset);
                  } catch (e1) {
                    message = null;
                    loggerError(mock.logger, e1);
                  }
                }
                // header 透传
                // ctx.status = e.response.status;
                for (let header in e.response.headers) {
                  let value = e.response.headers[header];
                  // handle 302 307 301
                  if (header === 'content-length') {
                    continue;
                  } else if (header === 'location') {
                    if (mock.isProxy) {
                      let myProxyURL = new RegExp(`https?://${mock.proxy}`, 'i');
                      let newValue = value.replace(myProxyURL, '');
                      if (newValue !== value) {
                        logger.debug('Change redirect from %s to %s', value, newValue);
                        value = newValue;
                      }
                    }
                  }
                  ctx.set(header, value);
                }
                lastResult = message;
              } else {
                lastResult = message || 'Server Inner Error';
              }
            }
            try {
              if (mockAfterFunction) {
                if (mock.type === 'json' || mock.type === 'javascript') {
                  mock.result = jsonUtil.getFromString(mock.result);
                }
                if (jsonUtil.isJSON(mock.result)) {
                  mock.result = new Function(
                    `try{ return (${mock.result});} catch(e){return {};}`
                  )();
                }
                await mockAfterFunction.call(mock, ctx, mock);
              }
            } catch (e) {
              mockException = true;
              mockExceptionInstance = e;
              loggerError(mock.logger, e);
            }
          } else {
            continue;
          }
        }
        // 如果用户自定义手动抛出Exception，则直接返回
        if (mockExceptionInstance && mockExceptionInstance instanceof WrapperError) {
          let status = mock._status;
          if (Wrapper.MESSAGE[status]) {
            lastResult = Wrapper.MESSAGE[status];
          } else {
            lastResult = mockExceptionInstance.message;
          }
          mockException = false;
          lastStatus = status;
        }
        if (mockException) {
          continue;
        } else {
          let interceptors = [];
          let proxy = 'none';
          if (mockBeforeFunction) {
            interceptors.push('Before');
          }
          if (mockResult) {
            interceptors.push('Content');
          }
          if (mock.requestOptions && mock.requestOptions.proxy) {
            proxy = mock.requestOptions.proxy || 'none';
            interceptors.push('Proxy');
          }
          if (mock.mockAfterFunction) {
            interceptors.push('After');
          }
          ctx.append('X-Mock-Interceptor', interceptors.length ? interceptors.join(',') : 'none');
          ctx.append('X-Mock-Intercept-By-Before', returnValue === false);
          ctx.append('X-Mock-Proxy', encodeURIComponent(proxy));
          renderToCookie(ctx, mock);
          mock.mockBeforeFunction = mockBeforeFunction;
          mock.mockBeforeReturn = returnValue;
          mock.mockContent = mockResult;
          mock.mockAfterFunction = mockAfterFunction;
          mock.mockException = mockException;
          break;
        }
      }

      ctx.append(
        'X-Mock-ProjectID',
        encodeURIComponent(mock.projectID || 'none')
      );
      ctx.append('X-Mock-Status', encodeURIComponent(mock._status || "200"));
      ctx.append('X-Mock-Delay', mock._delay);
      ctx.append('X-Mock-Rules', matchedMock.map(item => {
        if (item && item.item && item.item.path) {
          return item.item.path;
        }
        return "";
      }).filter(item => item).join(','));
      ctx.append('X-Mock-Rule-Matched', lastMockRule && lastMockRule.item && lastMockRule.item.path ? lastMockRule.item.path : "none");

      if (mockException) {
        // 出现异常
        ctx.body = lastResult || "Inner server error.";
        ctx.status = lastStatus || 500;
        return;
      }
      if (mockFetchResponse) {
        let headers = mockFetchResponse.headers;
        if (headers) {
          Object.keys(headers).forEach(key => {
            if (
              key === 'content-encoding' &&
              typeof headers[key] === 'string'
            ) {
              // 去掉gzip压缩的情况
              return;
            } else if (key === 'transfer-encoding') {
              return;
            }
            if (!mockReturnImmediately) {
              if (key === 'content-length') {
                return;
              }
            }
            ctx.append(key, headers[key]);
          });
        }
      }
      if (mockReturnImmediately && mockFetchResponse) {
        ctx.status = mockFetchResponse.statusCode || '200';
        ctx.body = mockFetchResponse.body;
      } else {
        ctx.status = lastStatus || 200;
        mock.result = lastResult || mock.result;
        renderToBody(ctx, mock);
      }
      printLog(mock, ctx);
      return;
    }
    await next();
  };
};

function printLog(mock, ctx) {
  let options = mock.requestOptions;
  let proxy = options && options.proxy ? options.proxy : 'none';
  let method =
    options && options.method ? options.method : mock.method || ctx.method;
  let url = options && options.url ? options.url : mock.url || ctx.url;
  let isBlock = mock.mockBeforeReturn === false;

  let id = mock.item && mock.item._id ? mock.item._id : 'none';
  let ua = ctx.header['user-agent'];
  let ip = ipUtils.getClientIP(ctx);
  let cost = Date.now() - mock.start;
  logger.info(
    `[${method}] ${
      ctx.status
    } "${url}" cost:${cost} _id:${id} projectID:${mock.projectID ||
      'none'} mockBefore:${!!mock.mockBeforeFunction} mockBeforeBlock:${
        isBlock
    } mockContent:${!!mock.mockContent} mockAfter:${
      !!mock.mockAfterFunction
    } mockError:${mock._status} mockDelay:${
      mock._delay
    } mockProxy:${proxy} ip:${ip} ua:"${ua}"`
  );
}

function renderToCookie(ctx, obj) {
  if (obj && obj.projectID) {
    let header = obj.host;
    if (header) {
      let domain = header;
      let aIP = isIp(header);
      let port = obj.isUsePort ? (obj.port || '') : '';
      if (aIP) {
        // do nothing
      } else {
        let domainInfo = parseDomain(domain, {
          customTlds: ['localhost', 'local']
        });
        if (domainInfo) {
          domain =
            (domainInfo.domain ? '.' + domainInfo.domain + '.' : '') +
            domainInfo.tld;
        }
      }
      domain = domain + (port > 0 ? ':' + port : '');
      let date = new Date();
      let maxAge = 30 * 24 * 3600 * 1000;
      date.setTime(date.getTime() + maxAge);
      ctx.cookies.set('projectID', obj.projectID, {
        path: '/',
        domain: domain,
        httpOnly: true,
        exipres: date,
        maxAge: maxAge
      });
    }
  }
}

function renderToBody(ctx, obj) {
  var item = obj.item;
  var mock = obj;
  var type = obj.type || item.type || 'json';
  var callback = obj.query['callback'] || obj.query['cb'];
  var result = obj.result || '';
  let isProxy = mock.requestOptions && mock.requestOptions.proxy;
  let proxy = isProxy ? mock.requestOptions.proxy : '';
  if (ctx.state.isSet) {
    return;
  }
  if (callback) {
    // 如果返回数据满足callback的格式，则不再包裹
    let reg = new RegExp(`${callback}\\((.)*\\)`, 'gi');
    if (reg.exec(result)) {
      callback = null;
    }
  }
  if (type === 'html' && isHTML(result)) {
    // insert js to html
    let IDNumber = `mockTool${Date.now()}`;
    result =
      result +
      `<script type="text/javascript">
      (function(){
        var elID = "${IDNumber}";
        var projectID = "${mock.projectID}";
        var proxy = "${proxy}";
        var str = '<div id="${IDNumber}-container" style="display:none; background: rebeccapurple; text-align: center;position: relative;bottom:20px; padding: 5px 10px; border-radius: 8px;">';
        str += '<div>projectID: ${mock.projectID}</div>';
        if(proxy){
          str += '<div>proxy: ' + proxy + '</div>';
        }
        if(projectID !== "undefined" && projectID !== "none" 
          && projectID !== "" && projectID !== "null"){
          str += '<div><a style="color: wheat;" href="javascript:void(0);" id="${IDNumber}-clear">清除ProjectID</a></div>';
        }
        str += '<div><a style="color: wheat;" href="javascript:void(0);" id="${IDNumber}-new">新ProjectID</a></div>';
        str += '</div>';
        str += '<p id="${IDNumber}-btn" style="cursor: pointer; margin:0; padding: 8px; width: 20px; border-radius: 20px; position: absolute; background: rebeccapurple; text-align: center; bottom: 0; right: 0; box-sizing: content-box;">+</p>'
        var aDiv = document.createElement('div');
        aDiv.setAttribute('style', 'position:fixed; bottom: 30px; right: 20px; font-size: 20px; z-index: 99999; color: white; margin-left: 20px;');
        aDiv.innerHTML = str;
        document.body.appendChild(aDiv);
        setTimeout(function(){
          hideContainer();
        }, 5000);
        var container = document.getElementById('${IDNumber}-container');
        var btn = document.getElementById('${IDNumber}-btn');
        var btnClear = document.getElementById('${IDNumber}-clear');
        var btnNew = document.getElementById('${IDNumber}-new');
        var isShow = false;
        btn.onclick = function(){
          if(isShow){
            hideContainer();
          }
          else{
            showContainer();
          }
        };
        if(btnClear){
          btnClear.onclick = function(e){
            newProjectID('none');
            e.preventDefault();
          };
        }
        if(btnNew){
          btnNew.onclick = function(e){
            var newID = prompt("输入新的projectID: ");
            if(newID && newID.trim()){
              newProjectID(newID);
            }
            e.preventDefault();
          };
        }
        function newProjectID(pid){
          var search = location.search;
          var reg = /[?&](projectID(=[^&$]*)?)/gi;
          var arr = reg.exec(search);
          if (arr) {
            search = search.replace(arr[1], 'projectID=' + encodeURIComponent(pid || ''));
          } else {
            if (search.indexOf('?') !== -1) {
              search += '&';
            } else {
              search += '?';
            }
            search += 'projectID=' + encodeURIComponent(pid || '');
          }
          location.href = window.location.protocol + "//" + location.host + location.pathname + search + location.hash;
        }
        function showContainer(){
          isShow = true;
          container.style.display = 'block';
          btn.innerHTML = '-';
        }
        function hideContainer(){
          isShow = false;
          container.style.display = 'none';
          btn.innerHTML = '+';
        }
      })();
    </script>`;
  }
  if (callback) {
    // jsonp
    ctx.type = 'js';
    switch (type) {
      case 'xml':
      case 'html':
      case 'text':
        result = result
          .replace(/'/g, "\\'")
          .replace(/\n/g, '')
          .replace(/\r/g, '');
        ctx.body = [
          'try{\n\t',
          callback,
          "('",
          result,
          "');\n}catch(e){}"
        ].join('');
        break;
      default:
        ctx.body = [
          'try{\n\t',
          callback,
          '(',
          typeof result === 'object' ? JSON.stringify(result, null, 4) : result,
          ');\n}catch(e){}'
        ].join('');
    }
  } else {
    switch (type) {
      case 'xml':
      case 'html':
      case 'text':
      case 'css':
        ctx.type = type;
        ctx.body = result;
        break;
      case 'javascript':
      case 'js':
        ctx.type = 'js';
        ctx.body = result;
        break;
      default:
        ctx.type = type;
        ctx.body =
          typeof result === 'object' ? JSON.stringify(result, null, 4) : result;
    }
  }
}