var log4js = require('log4js');
var stringFormat = require("string-format");
var WrapError = require("./wrapperError");
var MockJS = require("mockjs");

var logger = log4js.getLogger("Wrapper");
class Wrapper {
	constructor(ctx) {
		// Object.keys(MockJS).forEach(item => {
		// 	logger.info(`Inject ${item} to wrap instance.`);
		// 	this[item] = MockJS[item];
		// });

		this.MockJS = MockJS;
		this.mockjs = MockJS;
		this.mockJS = MockJS;
		this.ctx = ctx;
		this._status = Wrapper.OK;
		this._delay = 0;
		this._percent = [];
		this.one = this.any;
	}
	/**
	 * Delay for miniseconds specified by timeout
	 * @param {Number} timeout 
	 * @param {*Number} percent If use a random function.
	 */
	async delay(timeout, percent) {
		var random = this.random(percent);
		if (random && timeout > 0) {
			this._delay += timeout;
			return new Promise(function (resolve) {
				setTimeout(function () {
					resolve();
				}, timeout);
			});
		} else {
			return Promise.resolve();
		}
	}

	status(info, per) {
		let random = this.random(per);
		if (this._status != 200) {
			return this;
		}
		if (random) {
			this._status = info;
			throw new WrapError("Mock error by code: " + this._status);
		}
		return this;
	}
	run(fun, per) {
		let random = this.random(per);
		if (random) {
			if (typeof fun === "function") {
				fun();
			}
		}
		return this;
	}
	random(per) {
		let _per = per >= 0 ? per : 100;
		let random = Math.random() * 100;
		if (random < _per) {
			return true;
		}
		return false;
	}
	/**
	 * Tick to return a value in the list one by one.
	 * @param {Array|String} list The list to tick.
	 * @param {function} [callback] the callback function for each tick.
	 * @return {Object|null} The item in the list or null if the list's length is zero or null.
	 */
	tick(list, callback) {
		if (list && list.length > 0) {
			let ctx = this.ctx;
			let cookieKey = "APIMockWrapper";
			let length = list.length;
			if (this.item && this.item._id) {
				cookieKey = "APIMock" + this.item._id.toString();
			}
			if (cookieKey) {
				let value = 0;
				if (typeof this._tickValue === "number") {
					value = this._tickValue;
				} else {
					value = ctx.cookies.get(cookieKey);
					if (value >= 0) {
						value++;
					} else {
						value = 0;
					}
					this._tickValue = value;
					ctx.cookies.set(cookieKey, "" + value, {
						httpOnly: true
					});
				}
				let resultValue = list[value % length];
				if (typeof callback === "function") {
					let vv = callback(resultValue, value, list);
					if (typeof vv !== "undefined") {
						return vv;
					}
				}
				return resultValue;
			}
		}
		return null;
	}
	/**
	 * random to return a value in the list.
	 * @param {Array|String} list The list to random.
	 * @param {function} [callback] the callback function for each random.
	 * @return {Object|null} The item in the list or null if the list's length is zero or null.
	 */
	any(list, callback) {
		if (list && list.length > 0) {
			let length = list.length;
			let random = Math.floor(Math.random() * length);
			let resultValue = list[random];
			if (typeof callback === "function") {
				let vv = callback(resultValue, random, list);
				if (typeof vv !== "undefined") {
					return vv;
				}
			}
			return resultValue;
		}
		return null;
	}

	notFound(per) {
		return this.status(Wrapper.NOT_FOUND, per);
	}
	serverException(per) {
		return this.status(Wrapper.SERVER_EXCEPTION, per);
	}
}

/**
 * Not found
 */
Wrapper.NOT_FOUND = 404
/**
 * OK, default state.
 */
Wrapper.OK = 200
/**
 * Server exception.
 */
Wrapper.SERVER_EXCEPTION = 500

Wrapper.MESSAGE = {};
Wrapper.MESSAGE[Wrapper.NOT_FOUND] = "Mock Not Found!";
Wrapper.MESSAGE[Wrapper.SERVER_EXCEPTION] = "Mock Server Exception!";

exports = module.exports = Wrapper;