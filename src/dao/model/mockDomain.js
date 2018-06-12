var mongoose = require('mongoose');

var Schema = mongoose.Schema({
	"name": String,
	"host": String, // 多个域名使用英文(,)分割

	"description": String,
	"creator": String,
	"createdTime": Number,
	"modifier": String,
	"modifiedTime": Number
});

module.exports = exports = mongoose.model("MockDomain", Schema);

