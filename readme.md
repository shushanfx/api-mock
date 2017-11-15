# API-MOCK
不知你是否遇到此类情况：后台接口持续开发中，前端进度不依不饶，又或者是需要变化后台数据的某些状态，以验证展现是否正常。那么，如果你对这些情况束手无策时，不妨考虑这个mock平台。

## 目标
API Mock平台，为了解决如下需求：
1. 后台接口没有准备好，随时mock一个接口出来；
2. 管理后端接口，对后端接口有一个大致的了解。

## 如何使用
目前功能相对比较简单，只提供了简单的列表页面和编辑页面：
### 样例
样例请查看[example](./doc/example.md)

### 列表页
![列表页](./doc/list.png)
具体功能如下：
> 1. 点击【Add】跳转至编辑页，新增api配置；
> 2. 点击【编辑】跳转至指定的api编辑页进行编辑；
> 3. 点击【本地测试】【本地jsonp】，跳转至本地的一个测试页面，测试url形如[`http://localhost:8001/mock/test.php?mock-host=www.baidu.com&mock-path=%2Fzconfig%2Flist%3Fname%3D123%26value%3D%E5%8C%97%E4%BA%AC`](http://localhost:8001/mock/test.php?mock-host=www.baidu.com&mock-path=%2Fzconfig%2Flist%3Fname%3D123%26value%3D%E5%8C%97%E4%BA%AC)
> 4. 点击【host测试】【host jsonp】，跳转至一个真实的url地址，如果需要看mock效果，则需要配置host。
> 5. wiki，跳转至指定的wiki地址。

### 编辑页
新增&修改均会进入编辑，可以对api的属性、内容等进行编辑。
![编辑01](./doc/edit1.png)
各字段定义如下： 

**基本信息**

| 名称 | 对应字段 | 描述 | 必填 |
| ---------|----------|---------|-------- |
|  Name | name | API接口的名称 | Y |
|  Creatator | creator | 创建者信息，嵌入用户系统后需要实现该字段 | N |
|  Description | description | 接口的描述信息，后续考虑支持markdown语法 | N |

**API信息**

| 名称 | 对应字段 | 描述 | 必填 |
| ---------|----------|---------|-------- |
| Host | host | 需要mock的服务器域名，如`www.iqiyi.com`等 | Y |
| Port | port | 需要mock的服务器端口，默认80 | Y |
| Path | path | 接口的映射规则，如`/:name.do`、`/index.action`等，注意要使用`/`开头 | Y |
| Example | example | path的样例，允许带参数，如`/index.do?key=123` | N |
| Wiki | wiki | 真实接口的wiki地址。 | N |

**API内容**

| 名称 | 对应字段 | 描述 | 必填 |
| ---------|----------|---------|-------- |
| Data Type | type | 接口的数据类型，支持json|html|xml等格式 | Y |
| 前置操作 | isBefore | 是否启用抓取前过滤 | N |
| Before Get | onBefore | 前置过滤内容 | N |
| 使用自定义数据 | isContent | 是否使用自定义数据 | N |
| Content | content | 接口的内容 | N |
| 数据过滤器 | isFilter | 是否开启过滤器(filter) | N |
| Filter | filter | 过滤器脚本，请参考下文的`自定义Filter` | N |


### 前置操作、自定义Filter
可以通过mock平台的编辑页自定义接口的处理，并将处理结果插入response。自定义filter的处理如下图：
![自定义Filter](./doc/edit3.png)
编辑自定filter需注意如下事项：
> 1. 如果需要开启fiter，则需要勾选自定filter，否则将不进行处理。
> 2. 内容部分可以输入s语句，系统提供两个传入参数`ctx`和`mock`，详细信息见下；
> 3. 通过修改mock.result，达到修改返回值的目的。


**ctx**
基koa2传入的请求上线文，提供诸如`ctx.query`、`ctx.param`之类的方法。

**mock**
mock实例对象，提供一系列辅助方法。
>
> **mock.query**: query对象，等同于`ctx.query`;       
> **mock.param**: 通过path匹配的param对象，如path `/:name1/:name2`，匹配成功之后`mock.param`的值为`{name1 : value, name2: value}`，详细的匹配规则，请参考[url-pattern](https://www.npmjs.com/package/url-pattern);     
> **mock.result**: 需要回显至response的对象，如果api的数据格式(type)为json，该属性为一个json对象。
> **mock.path**: 当前匹配的路径     
> **mock.host**: 当前的host     
> **mock.port**: 当前的port     
> **mock.item**: 从数据库检索出的mock实例对象，各字段内容跟上文表格中保持一致。     
> **mock.cwd**: 当前工程的目录    
> **mock.request**: request对象，可用于发送http请求，如`await mock.request("http://www.iqiyi.com/a.json").then(function(){})`，详细文档请参考[request-promise](https://github.com/request/request-promise)     
> **mock.require**: *warnning，等同于`require`函数，不建议使用*，后续会增加配置功能，禁止嵌入该属性。     
> **mock.delay(timeout, percent)**: 有指定百分比(percent,0-100)的概率延迟指定时间(timeout ms)，如果percent未提供，则表示100. 如`await mock.delay(1000, 20)`，有20%的概率延迟1000ms。     
> **mock.status(status, percent)**: 有指定百分比(percent,0-100)的概率返回指定的状态码，如果percent未提供，则表示100。 如`mock.status(500, 30)`，有30%的概率返回500的状态码。     
> **mock.run(fun, percent)**: 有指定百分比(percent,0-100)的概率执行指定函数(fun)，如果percent未提供，则表示100。如`mock.run(function(){mock.result._id=1;}, 20)`。     
> **mock.random(percent)**: 判断是否在percent之内，之内则返回true，否则返回失败。如`mock.random(10)`，`mock.delay`/`mock.status`/`mock.run`均依赖该方法。      

**注意**
对于promise对象，需要使用await关键字修饰，其中`mock.delay`和`mock.request`方法返回promise对象。
[API详情](./doc/api.md)

## Filter样例
```javascript
// 20%的概率返回500
mock.status(500, 20)
// 10%的概率延迟200ms
await mock.delay(200, 10)
// 请求远程地址，返回mock
let result = await mock.request("http://www.iqiyi.com/a.json");
// 修改result内容，返回至response。
mock.result = result;
```


## 安装
* 数据安装，mongodb安装，完成之后执行`init/db.js`的脚本即可

* 下载代码，并运行
	```bash
	git clone https://github.com/shushanfx/api-mock.git
	cd api-mock
	# 如果需要配置数据库，请自行配置
	npm install && npm start
	```

## 感谢
项目中引入了一些开源库，感谢相关开源项目以及开源的同学，你们太伟大了！
* config
* glob
* koa
* koa-serve
* koa-bodyparser
* merge
* mockjs
* mongoose
* pug
* url-pattern

> *tips: 由于篇幅限制，只列举了部分引用项目。*

## LICENSE
MIT
