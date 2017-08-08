var AbstractRouter = require("../abstractRouter");

class IndexRouter extends AbstractRouter {
	init(){
		this.html("index", async function(ctx, next){
			await ctx.render("index", {
				"title": "首页"
			});	
		})
		.html("add", async function(ctx, next){
			await ctx.render("edit", {
				"title": "新增"
			});
		})
		.html("edit", async function(ctx, next){
			let id = ctx.query["_id"];
			if(id){
				await ctx.render("edit", {
					"title": "编辑",
					"_id": id
				});
			}
			else{
				await ctx.render("error", {
					"title": "错误",
					"message": "参数异常！"
				})
			}
		})			
		.html("about", async function(ctx, next){
			await ctx.render("about", {
				"title": "关于",
			});
		})
		.html("domain", async function(ctx, next){
			await ctx.render("domain", {
				"title": "域名列表"
			})
		})
	}
}

module.exports =exports = IndexRouter;