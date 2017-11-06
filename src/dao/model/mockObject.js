var mongoose = require('mongoose');

var MockObjectSchema = mongoose.Schema({
	"host": String,
	"port": Number,
	"path": String,
	"project": String, // 项目标识,
	"example": String,
	"wiki": String,

	"name": String,
	"description": String,
	"creator": String,
	"createdTime": Number,
	"modifier": String,
	"modifiedTime": Number,
	
	"type": String, // Type, json | html | xml
	"isContent": Number, // is used use defined data.
	"content": String, // mock content
	"onBefore": String, // before fetch 
	"isFilter": Number, // Does use filter function.
	"filter": String, // Filter async function, with one parameter: 
	// ctx, the context for the request.
	// ctx.data(json for object, xml / html for string)
});

module.exports = exports = mongoose.model("MockObject", MockObjectSchema);

