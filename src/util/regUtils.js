module.exports.str2Reg = function buildReg(str) {
  var _s = str;
  var specialChar = ['^', '.', '[', '$', '(', ')', '|', '*', '+', '?', '{', '\\'];
  if (typeof _s === "string") {
    _s = _s.trim();
  }
  if (_s) {
    let arr = _s.split('');
    let arr2 = [];
    for (let i = 0; i < arr.length; i++) {
      let ch = arr[i];
      if (specialChar.indexOf(ch) !== -1) {
        arr2.push('\\');
      }
      arr2.push(ch);
    }
    return new RegExp(arr2.join(''));
  }
}