var config = require("config");

module.exports = {
	prefix: config.get("prefix"),
	suffix: config.get("suffix"),
	checkPrefix(prefix){
		if(typeof prefix === "string"){
			let pre = prefix.trim();
			if(pre === "." 
				|| pre === "./"
				|| pre === "/"){
				return ""
			}
			else{
				return pre;
			}
		}
		return "";
	},
	uri(uri, withoutSuffix){
		var arr = [];
		if(this.prefix 
			&& this.prefix != "."
			&& this.prefix != "./"){
			arr.push(this.prefix);
		}
		else{
			arr.push(this.prefix);
		}
		if(uri && uri != "/"){
			arr.push(uri);
			if(!withoutSuffix && this.suffix){
				arr.push(this.suffix);
			}
		}
		return arr.join("");
	}
}