var AbstractRouter = require("../abstractRouter");
var dao = require("../dao/dao")
var Result = require("../bean/result");

function buildReg(str) {
  var _s = str;
  if (typeof _s === "string") {
    _s = _s.trim();
  }
  if (_s) {
    return new RegExp(_s);
  }
}

function buildQuery(obj) {
  var query = {}
  if (obj.name) {
    query.name = buildReg(obj.name);
  }
  if (obj.projectID) {
    query.projectID = buildReg(obj.projectID);
  }
  if (obj.follow) {
    query.follows = obj.follow;
  }

  return {
    query: query,
    pageIndex: obj.pageIndex,
    pageSize: obj.pageSize,
    order: null
  };
}

class BeRouter extends AbstractRouter {
  init() {
    var me = this;
    this.json("project/get", async function (ctx) {
        let _id = ctx.query["_id"];
        if (_id) {
          let mock = await dao.project.getByID(_id);
          ctx.body = Result.success(null, mock);
        } else {
          ctx.body = Result.illegal();
        }
      })
      .json("project/save", async function (ctx) {
        var obj = ctx.request.body;
        let username = ctx.cas ? ctx.cas.username : 'shushanfx';
        // projectID as reserve keyword
        if (obj && obj.name && obj.projectID != 'none') {
          if (!obj._id) {
            obj.creator = username;
            obj.createdTime = Date.now();
            obj.follows = username;
          }
          obj.modifier = username;
          obj.modifiedTime = Date.now();
          let mock = await dao.project.save(obj);
          ctx.body = Result.success(null, mock);
        } else {
          ctx.body = Result.illegal();
        }
      }, {
        method: "put"
      })
      .json("project/del", async function (ctx) {
        var obj = ctx.request.query;
        if (obj && obj._id) {
          let mock = await dao.project.remove(obj._id);
          ctx.body = Result.success(null, mock);
        } else {
          ctx.body = Result.illegal();
        }
      }, {
        method: "del"
      })
      .json("project/list", async function (ctx) {
        let obj = ctx.query;
        let username = ctx.cas ? ctx.cas.username : 'shushanfx';
        // TODO build parameter
        if (obj.owner === "true") {
          obj.follow = username;
        }
        obj = buildQuery(obj);
        let list = await dao.project.list(obj.query, obj.pageIndex, obj.pageSize, obj.order);
        ctx.body = Result.success(null, list);
      })
      .json("project/copy", async function (ctx) {
        let body = ctx.request.body;
        let username = ctx.cas.username;
        if (body && body._id && body.projectID && body.name) {
          try {
            let entity = await dao.project.copy(body._id, {
              name: body.name,
              creator: username,
              projectID: body.projectID
            });
            ctx.body = Result.success(null, entity);
          } catch (e) {
            ctx.body = Result.fail(e.message);
          }
        } else {
          ctx.body = Result.illegal();
        }
      }, {
        method: 'post'
      })
      .json('project/follow', async (ctx) => {
        let body = ctx.request.body;
        let username = ctx.cas.username;
        if (body && body._id) {
          let entity = await dao.project.follow(body._id, {
            username: username,
            action: body.action
          });
          if (entity) {
            ctx.body = Result.success(null, entity);
          } else {
            ctx.body = Result.fail();
          }
        } else {
          ctx.body = Result.illegal();
        }
      }, {
        method: 'post'
      })
  }
}

module.exports = exports = BeRouter;