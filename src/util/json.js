
const SEARCH_MAX = 50;
function getFromString(result){
	if(typeof result === "string"){
		let start = 0;
		let length = result.length;
		let end = length - 1;
		let lastTryArray = [],
			lastTryEnd = 0,
			lastCatchEnd = end,
			foundStart = false;
		while(start <= SEARCH_MAX && start < length){
			let charCode = result.charAt(start);
			if(charCode === '['){
				foundStart = true;
				break;
			}
			else if(charCode === "<"){
				// html
				start = end;
				break ;
			}
			else if(charCode === '{'){
				let sub = result.substring(lastTryEnd, start);
				if(sub.indexOf("try") != -1){
					lastTryEnd = start; 
					lastTryArray.push(lastTryEnd);
				}
				else {
					foundStart = true;
					break;
				}
			}
			start ++;
		}
		while(foundStart && end >= length - SEARCH_MAX && end > start){
			let charCode = result.charAt(end);
			if(result.charAt(end) === ']'){
				break;
			}
			else if(result.charAt(end) === '}'){
				if(lastTryArray.length > 0){
					let sub = result.substring(end, lastCatchEnd);
					// try {} catch(e){} module
					// try {} catch(e){} finally{} module
					if(/\}\s*catch/g.exec(sub)){
						lastTryArray.splice(0, 1);
						lastCatchEnd = end;
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
			return result;
		}
	}
	return result;
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