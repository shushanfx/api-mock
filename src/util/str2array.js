module.exports = {
  str2array: function (str, split) {
    var s = split || ",";
    if (typeof str === "string") {
      return str.split(s).map(value => {
        return value.trim();
      });
    }
    return [];
  },
  array2str: function (arr, split) {
    var s = split || ",";
    if (arr && Array.isArray(arr)) {
      return arr.join(s);
    }
    return "";
  }
}