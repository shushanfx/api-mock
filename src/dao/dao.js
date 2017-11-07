var mongoose = require("mongoose");
var config = require("config");
var merge = require("merge");
var debug = require("debug")("dao");
var urlPattern = require("url-pattern");

var Cache = require("./cache");
var str2array = require("../util/str2array");


var MockObject = require("./model/mockObject");
var cacheObject = new Cache();

function appendCache(entity){
	let list = null;
	if(entity && entity["_id"]){
		list = cacheObject.get("CacheObject");
		if(list){
			list.push(entity);
		}
	}
}
function updateCache(entity){
	var list = null;
	var found = -1;
	if(entity && entity["_id"]){
		list = cacheObject.get("CacheObject");
		if(list && list.length > 0){
			for(let i =0; i < list.length; i ++ ){
				let item = list[i];
				if(item && item._id === entity._id){
					found = i;
					break ;
				}
			}
			if(found != -1){
				list[found] = entity;
			}
		}
	}
}
function removeCache(entity){
	var list = null;
	var found = -1;
	if(entity && entity["_id"]){
		list = cacheObject.get("CacheObject");
		if(list && list.length > 0){
			for(let i =0; i < list.length; i ++ ){
				let item = list[i];
				if(item && item._id === entity._id){
					found = i;
					break ;
				}
			}
			if(found != -1){
				list.splice(found, 1);
			}
		}
	}
}

var obj = {
	/**
	 * @param {Function} cb
	 * @param {Error} err
	 */
	init: function(cb){
		this.db = mongoose.connect(config.get("db.url"), config.get("db"));
	},
	saveMock: async function(mock){
		let entity = null;
		if(mock._id){
			// if id was set.
			return new Promise(function(resolve, reject){
				MockObject.findById(mock._id, function(err, entity){
					if(err){
						reject(err);
					}
					else{
						Object.keys(mock).forEach(item => {
							entity[item] = mock[item];
						});
						entity.save(function(err){
							if(err){
								reject(err)
							}
							else{
								updateCache(entity);
								resolve(entity);
							}
						})
					}
				});	
			});
		}
		else{
			return new Promise(function(resolve, reject){
				let entity = new MockObject(mock);
				entity.save(function(err){
					if(err){
						reject(err);
					}
					else{
						appendCache(entity);
						resolve(entity);
					}
				})
			})
		}
	},
	getMock:async function(mockId){
		return new Promise(function(resolve, reject){
			MockObject.findById(mockId, function(err, entity){
				if(err){
					reject(err);
				}
				else{
					if(!entity){
						reject(new Error("Not Found!"));
					}
					else{
						resolve(entity);
					}
				}
			});
		});
	},
	queryMock:async function(mock, pageIndex, pageSize, order){
		var _index = pageIndex >= 1 ? pageIndex : 1, 
			_size = pageSize >= 1 ? 1 * pageSize : config.get("pager.size");
		var count = 0;
		return new Promise(function(resolve, reject){
			MockObject.count(mock, function(err, count){
				debug("QueryMock: count ", count);
				if(err){
					reject(err);
				}
				else if(count == 0){
					resolve({
						pageIndex: _index,
						pageSize: _size,
						total: 0,
						list: []
					});
				}
				else{
					let total = count;
					let end = 0, start;
					if(_index * _size > total){
						_index = Math.floor(total / _size) + 1;
						start = (_index - 1) * _size;
						end = Math.min(total, _index * _size);
					}
					else{
						start = (_index - 1) * _size;
						end = _index * _size;
					}
					MockObject.find(mock).skip(start).limit(_size).exec(function(err, list){
						if(err){
							reject(err);
						}
						else{
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
	queryAll: async function(){
		return new Promise(function(resolve, reject){
			MockObject.find({}, function(err, list){
				if(err){
					reject(err);
				}
				else{
					if(list && list.length > 0){
						resolve(list.map(item => {
							item.projectList = str2array.str2array(item.project);
							item.hostList = str2array.str2array(item.host);
							return item;
						}));
					}
					else{
						resolve([]);
					}
				}
			});
		})
	},
	query: async function(host, port, path){
		var list = cacheObject.get("CacheObject");
		var isFound = false, foundItem = null;
		debug("Find mock item by ", host, port, path);
		if(!list){
			list = await this.queryAll();
			cacheObject.set("CacheObject", list);
		}
		if(list && list.length > 0){
			list.forEach(item => {
				if(isFound){
					return item;
				}
				if(item && item.hostList.indexOf(host) != -1 
					&& item.port == port){
					// found same host
					if(!item.pattern){
						// init pattern with url-match
						item.pattern = new urlPattern(item.path);
					}
					let matched = item.pattern.match(path);
					if(matched){
						isFound = true;
						foundItem = {
							port,
							host,
							path,
							item,
							param: matched
						}
					}
				}
			});
		}
		return foundItem;
	},
	delMock: function(mockId){
		return new Promise(function(resolve, reject){
			MockObject.findByIdAndRemove(mockId, function(err, res){
				if(err){
					reject(err);
				}
				else{
					removeCache({"_id": mockId});
					resolve(res);
				}
			})
		})
	},
	domain: {
		getByID: function(id, callback){

		},
		query: function(domain, page, callback){

		},
		save: function(domain, callback){

		},
		update: function(domain, callback){

		},
		remove: function(domain, callback){

		}
	}
};

module.exports = exports = obj;