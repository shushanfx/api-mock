
const SEARCH_MAX = 50;
function getFromString(result){
	if(typeof result === "string"){
		let start = 0;
		let length = result.length;
		let end = length - 1;
		let isWithTry = false;
		while(start <= SEARCH_MAX && start < length){
			if(result.charAt(start) === '['){
				break;
			}
			else if(result.charAt(start) === '{'){
				let sub = result.substring(0, start);
				if(sub.indexOf("try") != -1){
					isWithTry = true;
				}
				else {
					break;
				}
			}
			start ++;
		}
		while(end >= length - SEARCH_MAX && end > start){
			if(result.charAt(end) === ']'){
				break;
			}
			else if(result.charAt(end) === '}'){
				if(isWithTry){
					let sub = result.substring(end);
					// try {} catch(e){} module
					// try {} catch(e){} finally{} module
					if(/\}\s*catch/g.exec(sub)){
						isWithTry = false;
					}
					// TODO try {} finally{} module, most jsonp would not like this,
					// so implement when encounted.
				}
				else{
					break;
				}
			}
			end --;
		}
		let subString = result.charAt(start) + result.charAt(end);
		if(subString === "{}" || subString === "[]"){
			// json 
			return result.substring(start, end + 1);
		}
		else{
			// not json, set it as a string.
			// replace " to ', \r and \n to empty.
			return "'" + result.replace(/\'/gi, "\"").replace(/\r|\n/gi, '') + "'";
		}
	}
	else if(typeof result === "object" && result !== null ){
		try{
			return JSON.stringify(result);
		} catch(e){

		}
	}
	return "";
}
function isJSON(result){
	if(typeof result === "string" ){
		let ret = result.trim();
		let start = 0, end = ret.length - 1;
		let subString = result.charAt(start) + result.charAt(end);
		if(subString === "{}" || subString === "[]"){
			return true;
		}
	}
	return false;
}


module.exports = {
	getFromString,
	isJSON
};