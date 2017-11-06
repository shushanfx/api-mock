var mongoose = require('mongoose');

var Schema = mongoose.Schema({
	"name": String,
	"host": String,
	

	"description": String,
	"creator": String,
	"createdTime": Number,
	"modifier": String,
	"modifiedTime": Number
});

module.exports = exports = mongoose.model("MockDomain", Schema);

