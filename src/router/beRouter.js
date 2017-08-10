var AbstractRouter = require("../abstractRouter");
var dao = require("../dao/dao")
var cache = require("../dao/cache");
var Result = require("../bean/result");

function buildReg(str){
	var _s = str;
	if(typeof _s === "string"){
		_s = _s.trim();
	}
	if(_s){
		return new RegExp(_s);
	}
}

function buildQuery(obj){
	var query = {}
	if(obj.name){
		query.name = buildReg(obj.name);
	}
	if(obj.host){
		query.host = buildReg(obj.host);
	}
	if(obj.path){
		query.path = buildReg(obj.path);
	}

	return {
		query: query,
		pageIndex: obj.pageIndex,
		pageSize: obj.pageSize,
		order: null
	};
}

class BeRouter extends AbstractRouter {
	init(){
		var me = this;
		this.json("be/get", async function(ctx){
			let _id = ctx.query["_id"];
			if(_id){
				let mock = await dao.getMock(_id);	
				ctx.body = Result.success(null, mock);
			}
			else{
				ctx.body = Result.illegal();
			}
		})
		.json("be/save", async function(ctx){
			var obj = ctx.request.body;
			if(obj && obj.name){
				let mock = await dao.saveMock(obj);
				ctx.body = Result.success(null, mock);
			}
			else{
				ctx.body = Result.illegal();
			}
		}, { method: "put"})
		.json("be/del", async function(ctx){
			var obj = ctx.request.body;
			if(obj && obj._id){
				let mock = await dao.delMock(obj._id);
				ctx.body = Result.success(null, mock);
			}
			else{
				ctx.body = Result.illegal();
			}
		}, { method: "del"})
		.json("be/list", async function(ctx){
			var obj = ctx.query;
			// TODO build parameter
			obj = buildQuery(obj);
			let list = await dao.queryMock(obj.query, obj.pageIndex, obj.pageSize, obj.order);
			ctx.body = Result.success(null, list);
		})
	}
}

module.exports = exports = BeRouter;