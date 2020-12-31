class Result {
  constructor(code, message, data) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

Result.success = function (message, data) {
  return new Result(1, message, data);
}
Result.fail = function (message, data) {
  return new Result(-1, message, data);
}
Result.illegal = function (data) {
  return new Result(-2, "Illegal Argument(s).", data);
}
Result.notAuth = function(data) {
  return new Result(-512, "Not auth", data);
}

module.exports = exports = Result;