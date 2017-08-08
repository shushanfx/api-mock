var AbstractRouter = require("../abstractRouter");

class BeRouter extends AbstractRouter {
	init(){
		this.json("be/{:id}", async function(ctx, next){

		})
		.json("be/{:id}", async function(ctx, next){

		}, { method: "put"})
		.json("be/{:id}", async function(ctx, next){

		}, { method: "del"})
	}
}