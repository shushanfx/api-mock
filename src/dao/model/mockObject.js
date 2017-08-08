var mongoose = require('mongoose');

var MockObjectSchema = mongoose.Schema({
	"host": String,
	"port": Number,
	"uri": String,
	"name": String,
	"description": String,
	"creator": String,
	"createdTime": Number,
	"modifier": String,
	"modifiedTime": Number,
	"type": String, // Type, json | html | xml
	"content": String, // mock content
	"isFilter": Number, // Does use filter function.
	"filter": String, // Filter async function, with one parameter: 
	// ctx, the context for the request.
	// ctx.data(json for object, xml / html for string)
});

module.exports = exports = mongoose.model("MockObject", MockObjectSchema);

