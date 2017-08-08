var mongoose = require("mongoose");
var config = require("config");
var merge = require("merge");

var MockObject = require("./model/mockObject");


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
						merge(true, entity, mock);
						entity.save(function(err){
							if(err){
								reject(err)
							}
							else{
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
			_size = pageSize >= 1 ? pageSize : config.get("pager.size");
		var count = 0;
		return new Promise(function(resolve, reject){
			MockObject.count(function(err, count){
				if(err){
					reject(err);
				}
				else if(count == 0){
					resolve({
						index: _index,
						size: _size,
						total: 0,
						list: []
					});
				}
				else{
					let total = count;
					let end = 0, start;
					if(_index * size > total){
						_index = Math.floor(total / size) + 1;
						start = (_index - 1) * _size;
						end = Math.min(total, _index * size);
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
							resolve({
								index: _index,
								size: _size,
								total: 0,
								list: []
							});
						}
					});
				}
			});
		});
	},
	delMock: function(mockId){
		return new Promise(function(resolve, reject){
			MockObject.findByIdAndRemove(mockId, function(err, res){
				if(err){
					reject(err);
				}
				else{
					resolve(res);
				}
			})
		})
	}
};

module.exports = exports = obj;