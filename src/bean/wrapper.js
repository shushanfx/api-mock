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
		var me = this;
		if (typeof percent === "number") {
			let random = Math.random() * 100;
			if (random <= percent) {
				return Promise.resolve(me);
			}
		}
		me._delay += timeout;
		return new Promise(function (resolve) {
			setTimeout(function () {
				resolve(me);
			}, timeout);
		});
	}

	status(per, info) {
		if (this._status != 200) {
			return this;
		}
		let random = Math.random() * 100;
		if (random <= per) {
			this._status = info;
			throw new WrapError("Mock error by code: " + this._status);
		}
		return this;
	}

	notFound(per) {
		return this.status(per, Wrapper.NOT_FOUND);
	}
	serverException(per) {
		return this.status(per, Wrapper.SERVER_EXCEPTION);
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