const mongoose = require('mongoose');

const MockObjectSchema = mongoose.Schema({
	"host": String,
	"isUsePort": Number, // 是否使用自定义端口
	"port": Number,
	"path": String,
	"isNotRedirect": Number, // 是否禁止重定向，如302、304等
	"isNotTunnelHeader": Number, // 是否禁止透传header
	"project": String, // 项目标识,
	"example": String,
	"wiki": String,

	"name": String,
	"description": String,
	"creator": String,
	"createdTime": Number,
	"modifier": String,
	"modifiedTime": Number,
	"rank": Number,

	"type": String, // Type, json | javascript | html | xml | file | directory | text
	"filePath": String,
	"isContent": Number, // is used use defined data.
	"content": String, // mock content
	"isProxy": Number, // whether to use proxy for request.
	"proxy": String, // proxy string, host:port, default port is 80.
	"isBefore": Number, // whether to execute the on before operation.
	"onBefore": String, // before fetch, return false to terminate the operation immediately. 
	"isFilter": Number, // Does use filter function.
	"filter": String, // Filter async function, with one parameter: 
	// ctx, the context for the request.
	// ctx.data(json for object, xml / html for string)
});

module.exports = mongoose.model("MockObject", MockObjectSchema);
module.exports.Schema = MockObjectSchema;