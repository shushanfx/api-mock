var path = require("path");
var fs = require("fs");

var koaSend = require("koa-send");
var debug = require("debug")("fileMiddle");

var util = require("./util");



module.exports = function(directories, prefix){
	var _pre = util.checkPrefix(prefix);
	var _dir = directories;
	if(!Array.isArray(directories)){
		_dir = [directories]
	}
	return async function(ctx, next){
		let uri = ctx.path;
		let isFound = false,
			directory = null;
		if(_pre && typeof uri === "string" && uri.startsWith(_pre)){
			uri = uri.substring(_pre.length);
		}
		if(typeof uri === "string" && !uri.startsWith("/")){
			uri = "/" + uri;
		}
		for(let i = 0, size = _dir.length; i < size; i++){
			let item = _dir[i];
			let _finalPath = path.resolve(item, "." + uri);
			debug("Search with path ", _finalPath);
			if(fs.existsSync(_finalPath)){
				directory = item;
				isFound = true;
				break;
			}
		}
		debug("Path ", uri, " result: ", isFound);
		if(isFound){
			debug("Found path {} in {}", uri, directory);
			await koaSend(ctx, uri, {root: path.resolve(directory)});
		}
		else{
			await next();
		}
	}
}