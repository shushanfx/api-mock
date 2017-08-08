var urlPattern = require("url-pattern");
var merge = require("merge");
var config = require("config");

class AbstractRouter {
	constructor(){
		this.map = {};
		this.prefix = config.get("prefix");
		this.suffix = config.get("suffix");
	}
	/**
	 * Init for router.
	 */
	init(){

	}
	html(uri, handler, options){
		return this._register(merge(true, {
			uri,
			handler,
			type: "html"
		}, options));
	}
	json(uri, handler, options){
		return this._register(merge(true, {
			uri,
			handler,
			type: "json"
		}, options));
	}
	match(url){
		var ret = null;
		for(let key in this.map){
			let item = this.map[key];
			if(!item.pattern){
				item.pattern = urlPattern(key);
			}
			let match = item.pattern.match(url);
			if(match){
				return merge({
					key,
					match: match 
				}, item);
			}
		}
		return ;
	}
	_register(options){
		this.map[this._getPath(options.uri)] = options;
		return this;
	}
	_getPath(uri){
		var arr = [];
		if(this.prefix){
			arr.push(this.prefix);
		}
		arr.push(uri);
		if(this.suffix && uri != "/"){
			arr.push(this.suffix);
		}
		return arr.join("");
	}
}

module.exports = exports = AbstractRouter;