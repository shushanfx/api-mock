var log4js = require('log4js');
var stringFormat = require("string-format");
var WrapError = require("./wrapperError");

var logger = log4js.getLogger("Wrapper");
class Wrapper {
	constructor(ctx) {
		this.ctx = ctx;
		this._status = Wrapper.OK;
		this._delay = 0;
		this._percent = [];
	}
	/**
	 * Delay for miniseconds specified by timeout
	 * @param {Number} timeout 
	 * @param {*Number} percent If use a random function.
	 */
	async delay(timeout, percent) {
		var random = this.random(percent);
		if(random && timeout > 0){
			this._delay += timeout;
			return new Promise(function (resolve) {
				setTimeout(function () {
					resolve();
				}, timeout);
			});
		}
		else{
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
	run(fun, per){
		let random = this.random(per);
		if(random){
			if(typeof fun === "function"){
				fun();
			}
		}
		return this;
	}
	random(per){
		let _per = per >= 0 ? per: 100;
		let random = Math.random() * 100;
		if(random <= _per){
			return true;
		}
		return false;
	}

	notFound(per) {
		return this.status(Wrapper.NOT_FOUND, per);
	}
	serverException(per) {
		return this.status(Wrapper.SERVER_EXCEPTION, per);
	}
}

Wrapper.use = function use() {
	return async function (ctx, next) {
		let req = ctx.request;
		ctx.wrapper = new Wrapper(ctx);
		await next().catch(e => {
			let status = ctx.wrapper._status;
			if (e instanceof WrapError) {
				if (Wrapper.MESSAGE[status]) {
					ctx.response.body = Wrapper.MESSAGE[status];
				}
				else {
					ctx.response.body = e.message;
				}
				ctx.response.status = status;
			}
			else {
				throw e;
			}
		});
		logger.info(stringFormat("Wrapper {0} {1} -> delay: {2}, status: {3}",
			req.host, req.path, ctx.wrapper._delay, ctx.wrapper._status));
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