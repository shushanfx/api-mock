var mongoose = require('mongoose');

var Schema = mongoose.Schema({
    "projectID": String, // 项目ID
    "name": String, // 项目名称
    "description": String, // 项目描述

	"description": String,
	"creator": String,
	"createdTime": Number,
	"modifier": String,
	"modifiedTime": Number
});

module.exports = exports = mongoose.model("MockDomain", Schema);

