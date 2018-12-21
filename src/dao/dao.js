var mongoose = require("mongoose");
var config = require("config");
var debug = require("debug")("dao");
var urlPattern = require("url-pattern");

var Cache = require("./cache");
var str2array = require("../util/str2array");

const logger = require('log4js').getLogger('dao');
const MockObject = require("./model/mockObject");
const MockProject = require('./model/mockProject');
const MockObjectPlugin = require('./plugin/mockObjectPlugin');
const cacheObject = new Cache();

const obj = {
	async fillCache() {
		let list = cacheObject.get("CacheObject");
		if (!list) {
			list = await this.queryAll();
			cacheObject.set("CacheObject", list);
			logger.info('Fill cache %d', list ? list.length : 0);
		}
	},
	/**
	 * @param {Function} cb
	 * @param {Error} err
	 */
	init: function (cb) {
		this.db = mongoose.connect(config.get("db.url"), config.get("db"));
		MockObjectPlugin.init(MockObject.Schema, cacheObject);
		this.fillCache();
	},
	saveMock: async function (mock) {
		let entity = null;
		if (mock._id) {
			// if id was set.
			return new Promise(function (resolve, reject) {
				MockObject.findById(mock._id, function (err, entity) {
					if (err) {
						reject(err);
					} else {
						Object.keys(mock).forEach(item => {
							entity[item] = mock[item];
						});
						entity.save(function (err) {
							if (err) {
								reject(err)
							} else {
								resolve(entity);
							}
						})
					}
				});
			});
		} else {
			return new Promise(function (resolve, reject) {
				let entity = new MockObject(mock);
				entity.save(function (err) {
					if (err) {
						reject(err);
					} else {
						resolve(entity);
					}
				})
			})
		}
	},
	getMock: async function (mockId) {
		return new Promise(function (resolve, reject) {
			MockObject.findById(mockId, function (err, entity) {
				if (err) {
					reject(err);
				} else {
					if (!entity) {
						reject(new Error("Not Found!"));
					} else {
						resolve(entity);
					}
				}
			});
		});
	},
	queryMock: async function (mock, pageIndex, pageSize, order) {
		var _index = pageIndex >= 1 ? pageIndex : 1,
			_size = pageSize >= 1 ? 1 * pageSize : config.get("pager.size");
		var count = 0;
		return new Promise(function (resolve, reject) {
			MockObject.count(mock, function (err, count) {
				debug("QueryMock: count ", count);
				if (err) {
					reject(err);
				} else if (count == 0) {
					resolve({
						pageIndex: _index,
						pageSize: _size,
						total: 0,
						list: []
					});
				} else {
					let total = count;
					let end = 0,
						start;
					if (_index * _size > total) {
						_index = Math.floor(total / _size) + 1;
						start = (_index - 1) * _size;
						end = Math.min(total, _index * _size);
					} else {
						start = (_index - 1) * _size;
						end = _index * _size;
					}
					let queryObject = MockObject.find(mock).skip(start).limit(_size);
					if (order) {
						queryObject.sort(order);
					}
					queryObject.exec(function (err, list) {
						if (err) {
							reject(err);
						} else {
							var obj = {
								pageIndex: _index,
								pageSize: _size,
								total: total,
								list: list
							};
							debug("QueryMock obj ", obj);
							resolve(obj);
						}
					});
				}
			});
		});
	},
	queryByPID: async function (projectID) {
		return new Promise(resolve => {
			MockObject.find({
				project: projectID
			}).sort({
				host: 1
			}).exec((err, list) => {
				if (err) {
					resolve([])
				} else {
					resolve(list);
				}
			})
		})
	},
	queryAll: async function () {
		return new Promise(function (resolve, reject) {
			MockObject.find({}).sort({
				host: 1,
				rank: 1
			}).exec(function (err, list) {
				if (err) {
					reject(err);
				} else {
					if (list && list.length > 0) {
						resolve(list.map(item => {
							item.projectList = str2array.str2array(item.project);
							item.hostList = str2array.str2array(item.host);
							return item;
						}));
					} else {
						resolve([]);
					}
				}
			});
		})
	},
	query: async function (host, port, path, projectID) {
		var list = cacheObject.get("CacheObject");
		var foundItem = null;
		if (!projectID) {
			return foundItem;
		}
		debug("Find mock item by ", projectID, host, port, path);
		if (!list) {
			list = await this.queryAll();
			cacheObject.set("CacheObject", list);
		}
		if (list && list.length > 0) {
			for (let i = 0; i < list.length; i++) {
				let item = list[i];
				if (item &&
					item.project === projectID &&
					item.host === host) {
					if ((!item.isUsePort && !port) ||
						(item.isUsePort && port == item.port)) {
						if (item.path && !item.pattern) {
							// init pattern with url-match
							try {
								item.pattern = new urlPattern(item.path.trim());
							} catch (e) {
								item.pattern = null;
							}
						}
						if (!item.pattern) {
							console.warn(`${host}:${port}${item.path || ''}匹配规则创建失败！`);
							continue;
						}
						let matched = item.pattern.match(path);
						if (matched) {
							foundItem = {
								port,
								host,
								path,
								item,
								param: matched
							}
							break;
						}
					}
				}
			}
		}
		return foundItem;
	},

	delMock: function (mockId) {
		return new Promise(function (resolve, reject) {
			MockObject.findById(mockId, (err, entity) => {
				if (err) {
					reject(err);
				} else {
					entity.remove((err) => {
						if (err) {
							reject(err);
						} else {
							resolve(entity);
						}
					})
				}
			});
		})
	},
	copyMock: async function (mockId, mock) {
		return new Promise((resolve, reject) => {
			MockObject.findById(mockId, (err, entity) => {
				if (err) {
					resolve(null);
				} else {
					let newObject = mock;
					Object.keys(entity._doc).forEach(key => {
						if (key && key.indexOf('_') === 0) {
							return
						}
						if (typeof newObject[key] === "undefined") {
							newObject[key] = entity[key];
						}
					});
					let instance = new MockObject(newObject);
					instance.save((err, entity) => {
						if (err) {
							resolve(null);
						} else {
							resolve(entity);
						}
					})
				}
			})
		});
	},
	project: {
		getByID: async function (id) {
			return new Promise(resolve => {
				MockProject.findById(id, (err, entity) => {
					if (err) {
						resolve(null)
					} else {
						resolve(entity);
					}
				});
			})
		},
		getByName: async function (name) {
			return new Promise((resolve) => {
				MockProject.find({
					name: name
				}, (err, list) => {
					if (err) {
						resolve([]);
					} else {
						resolve(list);
					}
				});
			});
		},
		save: async function (project) {
			//	"creator": String,
			//	"createdTime": Number,
			//	"modifier": String,
			//	"modifiedTime": Number
			if (project._id) {
				// if id was set.
				return new Promise(function (resolve, reject) {
					MockProject.findById(project._id, function (err, entity) {
						if (err) {
							resolve(null);
						} else {
							Object.keys(project).forEach(item => {
								entity[item] = project[item];
							});
							entity.save(function (err) {
								if (err) {
									resolve(null)
								} else {
									resolve(entity);
								}
							})
						}
					});
				});
			} else {
				return new Promise(function (resolve, reject) {
					let entity = new MockProject(project);
					entity.save(function (err, entity) {
						if (err) {
							resolve(null);
						} else {
							resolve(entity);
						}
					})
				})
			}
		},
		copy: async function (_id, {
			creator,
			projectID,
			name
		}) {
			let entity = await this.getByID(_id);
			if (!entity) {
				return false
			}
			let oldProjectID = entity.projectID;
			// copy project
			let newObject = {
				projectID: projectID,
				creator: creator,
				follows: [creator],
				modifiedTime: Date.now(),
				modifier: creator,
				createdTime: Date.now(),
				name: name
			};
			Object.keys(entity._doc).forEach(key => {
				if (key && key.indexOf('_') === 0) {
					return
				}
				if (typeof newObject[key] === "undefined") {
					newObject[key] = entity[key];
				}
			});
			newObject = await this.save(newObject);
			if (!newObject) {
				return newObject;
			}
			let list = await obj.queryByPID(oldProjectID);
			if (list && list.length) {
				for (let i = 0; i < list.length; i++) {
					let item = list[i];
					let newItem = {
						creator,
						createdTime: newObject.createdTime,
						modifier: newObject.modifier,
						modifiedTime: newObject.modifiedTime,
						project: newObject.projectID
					};
					try {
						await obj.copyMock(item._id, newItem);
					} catch (e) {

					}
				}
			}
			return newObject;
		},
		remove: async function (_id) {
			let entity = await MockProject.findByIdAndRemove(_id)
			if (entity) {
				let list = await obj.queryByPID(entity.projectID);
				if (list && list.length) {
					for (let i = 0; i < list.length; i++) {
						let item = list[i];
						await item.remove();
					}
				}
			}
			return entity;
		},
		list: async function (project, pageIndex, pageSize, order) {
			let _index = pageIndex >= 1 ? pageIndex : 1;
			let _size = pageSize >= 1 ? 1 * pageSize : config.get("pager.size");
			return new Promise(function (resolve, reject) {
				MockProject.count(project, function (err, count) {
					debug("QueryMock: count ", count);
					if (err) {
						reject(err);
					} else if (count == 0) {
						resolve({
							pageIndex: _index,
							pageSize: _size,
							total: 0,
							list: []
						});
					} else {
						let total = count;
						let end = 0,
							start;
						if (_index * _size > total) {
							_index = Math.floor(total / _size) + 1;
							start = (_index - 1) * _size;
							end = Math.min(total, _index * _size);
						} else {
							start = (_index - 1) * _size;
							end = _index * _size;
						}
						MockProject.find(project).skip(start).sort({
							createdTime: -1
						}).limit(_size).exec(function (err, list) {
							if (err) {
								reject(err);
							} else {
								var obj = {
									pageIndex: _index,
									pageSize: _size,
									total: total,
									list: list
								};
								debug("QueryMock obj ", obj);
								resolve(obj);
							}
						});
					}
				});
			});
		},
		follow: async function (_id, {
			username,
			action
		}) {
			return new Promise(resolve => {
				MockProject.findById(_id, (err, entity) => {
					if (entity) {
						if (!entity.follows) {
							entity.follows = [];
						}
						let index = entity.follows.indexOf(username);
						let isSave = false;
						if (action === 'remove') {
							if (index >= 0) {
								isSave = true;
								entity.follows.splice(index, 1);
							}
						} else {
							if (index === -1) {
								entity.follows.push(username);
								isSave = true;
							}
						}
						if (isSave) {
							entity.save((err) => {
								if (err) {
									resolve(null);
								} else {
									resolve(entity);
								}
							});
						} else {
							resolve(null);
						}

					} else {
						resolve(null);
					}
				})
			});
		}
	},
	domain: {
		getByID: function (id, callback) {

		},
		query: function (domain, page, callback) {

		},
		save: function (domain, callback) {

		},
		update: function (domain, callback) {

		},
		remove: function (domain, callback) {

		}
	}
};

Object.defineProperty(obj, 'connection', {
	enumerable: false,
	get: function () {
		return this.db;
	}
})

module.exports = exports = obj;