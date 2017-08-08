var AbstractRouter = require("../abstractRouter");

class IndexRouter extends AbstractRouter {
	init(){
		this.html("index", async function(ctx, next){
			await ctx.render("index");	
		});			
	}
}

module.exports =exports = IndexRouter;