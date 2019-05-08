class Cache {
  /**
   * Create a cache instance with a timeout
   * @param {Number} [timeout] Cache timeout, default is 10 min{60 * 10 * 1000}
   */
  constructor(timeout) {
    this.timeout = timeout || 10 * 60 * 1000;
    this._obj = {};
  }

  /**
   * Get a value from the cache.
   * @param {String} key The cache key.
   * @return {any} undefined is it is not set, or expired.
   */
  get(key) {
    if (this._obj && this._obj[key]) {
      let obj = this._obj[key];
      let time = Date.now();
      if (obj.expired >= time) {
        return obj.value;
      } else {
        delete this._obj[key];
      }
    }
  }
  /**
   * set cache value.
   * @param {String} key
   * @param {any} value The value of the cache.
   * @param {Number} [timeout] Default is the system timeout.
   */
  set(key, value, timeout) {
    var t = timeout || this.timeout;
    var time = Date.now();
    if (this._obj) {
      this._obj[key] = {
        value: value,
        expired: t + time
      };
    }
  }
  expire(key) {
    if (this._obj && this._obj[key]) {
      this._obj[key].expired = -1;
    }
  }
}

Cache.cache = new Cache();

module.exports = exports = Cache