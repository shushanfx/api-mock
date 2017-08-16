# API
本文所说的API指定义Filter时，可以使用的方法或者属性。filter注入的属性包括两个[ctx](#ctx)、[mock](#mock)

# ctx
即koa2 [`context`](https://github.com/koajs/koa/blob/master/docs/api/context.md)实例， [中文指导](https://github.com/guo-yu/koa-guide)

# mock
Mock实例

## mock.result
最终输出要页面的属性，Mock系统会将该字段的内容输出到页面，如果值为Object，则会进行JSON.stringify转换。
```
// 修改result的内容。
mock.result = {
	"newName": "newValue"
}
```

## mock.query
query对象，url传过来的参数，如`/index.action?name1=value&name2=value`, 则query的值为`{name1: "value", name2: "value"}`

## mock.param
通过path匹配的param对象，如path `/:name1/:name2`，匹配成功之后`mock.param`的值为`{name1 : value, name2: value}`，详细的匹配规则，请参考[url-pattern](https://www.npmjs.com/package/url-pattern); 

## mock.host
mock的host，默认使用`ctx.host`，如果query中有`mock-host`，则使用`mock-host`参数的值。
```javascript
// url : http://mockhost.com/path?name=1
// 此时 mock.host = "mockhost.com"

// url : http://mockhost.com/path?name=1&mock-host=mockhost2.com
// 此时 mock.host = "mockhost2.com" 
```

## mock.port
mock的port，默认取`ctx.port`，如果query中有`mock-port`，则使用`mock-port`参数的值。 参考[mock.host](##mock.host)

## mock.path
mock的path，默认取`ctx.path`，如果query中有`mock-path`，则使用`mock-path`参数的值。参考[mock.host](##mock.host)

## mock.item
从moogodb中检索的数据，字段内容如下：
```javascript
var MockObjectSchema = mongoose.Schema({
	"host": String,
	"port": Number,
	"path": String,
	"example": String,
	"wiki": String,

	"name": String,
	"description": String,
	"creator": String,
	"createdTime": Number,
	"modifier": String,
	"modifiedTime": Number,
	
	"type": String, // Type, json | html | xml
	"content": String, // mock content
	"isFilter": Number, // Does use filter function.
	"filter": String, // Filter async function content.
});
```

## item.cwd
当前工程的目录地址，跟`process.cwd()`的返回值一样。

## mock.request(url[, options])
request方法**async function**，可用于发送http请求，如：
```javascript
var result = await mock.request("http://www.iqiyi.com/a.json")
// 显示result内容。
console.dir(result);
```
更多文档请参阅 [request-promise](https://github.com/request/request-promise)

## mock.require()
同nodejs的`require`方法，可能会引入不安全的操作，请**谨慎**使用！

## mock.delay(timeout[, percent])
延迟指定时间**async function**，延迟指定百分比(percent,0-100)的概率的时间(timeout ms)，如果percent未提供，则表示100.
```javascript
// 20%的概率延迟1000ms
await mock.delay(1000, 20);
// 延迟100ms
await mock.delay(100);
```

## mock.status(status[, percent])
返回指定状态码， 按照指定的百分比(percent, 0-100)返回指定的状态码(status)，如果percent未提供，则表示100.
```javascript
// 20%的概率返回 500
mock.status(500, 20);
// 10%的概率返回 404
mock.status(404, 10);
```

## mock.run(function[, percent])
运行指定函数，按照指定的百分比(percent, 0-100)执行指定function，如果percent未提供，则表示100.
```javascript
// 10%的概率执行function
mock.run(function(){
	console.info("test");
}, 10);
```

## mock.random(percent)
随机函数，percent(0-100), 内部生成一个随机数，如果小于percent，则返回true，否则返回false。`mock.run`、`mock.delay`、`mock.status`均依赖该方法。
```javascript
// true | false
let a = mock.random(10);
```

## mock.MockJS 或 MockJS
MockJS对象，详细信息请参阅[`mockjs`](http://mockjs.com/examples.html)。
```javascript
// MockJS === mock.MockJS
mock.result = MockJS.mock({
	"string|1-10": "*",
  	"number|1-10.1-10": 1,
  	"take": "@date",
  	"b": "@boolean",
  	"ran": "@integer(1, 1000)",
  	"stringRandom": "@string(10)",
  	"array|1-3": [{
    	"id|+1": 1,
      	"content": "@sentence",
      	"description": "@cparagraph"
    }],
  	"obj|2-4": {
      "310000": "上海市",
      "320000": "江苏省",
      "330000": "浙江省",
      "340000": "安徽省"
    },
  	"ip": "@ip",
  	"email": "@email",
  	"domain": "@domain",
  	"url": "@url",
  	"author": "@name",
  	"color": "@color",
  	"staticP": {
    	"name": "@name",
      	"id": "@guid"
    }
});
```
