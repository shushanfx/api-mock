const AbstractRouter = require("../abstractRouter");
const dao = require("../dao/dao")
const Result = require("../bean/result");
const regUtils = require('../util/regUtils');

function buildQuery(obj) {
  var query = {}
  let order = null;
  if (obj.name) {
    query.name = regUtils.str2Reg(obj.name);
  }
  if (obj.host) {
    query.host = regUtils.str2Reg(obj.host);
  }
  if (obj.path) {
    query.path = regUtils.str2Reg(obj.path);
  }
  if (obj.project) {
    query.project = new RegExp("(^|,)" + obj.project + "(,|$)");
  }

  if (obj.projectID) {
    query.project = obj.projectID;
    order = {
      host: 1,
      rank: 1
    }
  }
  return {
    query: query,
    pageIndex: obj.pageIndex,
    pageSize: obj.pageSize,
    order: order
  };
}

class BeRouter extends AbstractRouter {
  init() {
    this.json("be/get", async function (ctx) {
        let _id = ctx.query["_id"];
        if (_id) {
          let mock = await dao.getMock(_id);
          ctx.body = Result.success(null, mock);
        } else {
          ctx.body = Result.illegal();
        }
      })
      .json("be/save", async function (ctx) {
        let obj = Object.assign({}, ctx.request.body);
        /**
         *"creator": String,
         "createdTime": Number,
         "modifier": String,
         "modifiedTime": Number,
         "rank": Number,
         */
        let username = ctx.cas ? ctx.cas.username : (obj.creator || "shushanfx");
        if (obj && obj.name) {
          let now = Date.now();
          if (obj._id) {
            obj.modifier = username;
            obj.modifiedTime = now;
          } else {
            obj.creator = username;
            obj.createdTime = now;
            obj.modifier = username;
            obj.modifiedTime = now;
            obj.rank = now;
          }
          let mock = await dao.saveMock(obj);
          ctx.body = Result.success(null, mock);
        } else {
          ctx.body = Result.illegal();
        }
      }, {
        method: "put"
      })
      .json("be/del", async function (ctx) {
        var obj = ctx.query;
        if (obj && obj._id) {
          let mock = await dao.delMock(obj._id);
          ctx.body = Result.success(null, mock);
        } else {
          ctx.body = Result.illegal();
        }
      }, {
        method: "del"
      })
      .json("be/list", async function (ctx) {
        var obj = ctx.query;
        // TODO build parameter
        obj = buildQuery(obj);
        let list = await dao.queryMock(obj.query, obj.pageIndex, obj.pageSize, obj.order);
        ctx.body = Result.success(null, list);
      })
      .json("be/rank", async function (ctx) {
        let body = ctx.request.body;
        let obj1 = {
          _id: body._id1,
          rank: body.rank1
        };
        let obj2 = {
          _id: body._id2,
          rank: body.rank2
        };
        if (obj1._id && obj1.rank > 0 &&
          obj2._id && obj2.rank > 0) {
          let mock1 = await dao.saveMock(obj1);
          let mock2 = await dao.saveMock(obj2);
          ctx.body = Result.success(null, [
            mock1,
            mock2
          ]);
        } else {
          ctx.body = Result.illegal(body);
        }
      }, {
        method: "post"
      })
      .json("be/copy", async function (ctx) {
        let body = ctx.request.body;
        let username = ctx.cas.username;
        if (body && body._id) {
          try {
            let now = Date.now();
            ctx.body = await dao.copyMock(body._id, {
              creator: username,
              createdTime: now,
              modifier: username,
              modifiedTime: now
            });
          } catch (e) {
            ctx.body = Result.fail(e.message);
          }
        } else {
          ctx.body = Result.illegal();
        }
      }, {
        method: "post"
      })
  }
}

module.exports = exports = BeRouter;