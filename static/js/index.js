$(function(){
	var $btnSearch = $("#btnSearch"),
		$table = $(".table");

	$btnSearch.on("click", function(e){
		getList()
		e.preventDefault();
	});

	getList();

	function getList(){
		var url = $btnSearch.attr("data-search-url");
		var name = $.trim($("#txtName").val()),
			domain = $.trim($("#txtDomain").val()),
			path = $.trim($("#txtPath").val());
		var pageIndex = $.trim($("txtPageIndex").val()),
			pageSize = $.trim($("#txtPageSize").val());

		if(url){
			$.ajax({
				url: url, 
				data: {
					name: name,
					host: domain,
					path: path,
					pageSize: pageSize,
					pageIndex: pageIndex
				}, 
				timeout: 3000,
				success: function(result){
					buildList(result);
				},
				error: function(){
					buildList(null);
				}
			});
		}
	}

	function buildList(result){
		if(result && result.data && result.data.list && result.data.list.length > 0){
			$table.find("tr").filter(":gt(0)").remove();
			var html = [];
			var count = (result.data.pageIndex - 1) * result.data.pageSize
			$.each(result.data.list, function(index, item){
				html.push("<tr>");
				html.push("<td>", count ++, "</td>")
				html.push("<td>", item.name, "</td>");
				html.push("<td>", item.host, "</td>");
				html.push("<td>", item.path, "</td>");
				html.push("<td>", item.type, "</td>");
				html.push("<td>", buildOptions(item), "</td>");
				html.push("</tr>");
			})
			$table.append(html.join(""));
		}
		else{
			$table.find("tr").filter(":gt(0)").remove();
			$table.append('<tr><td colspan="6"><div class="text-center" style="height:200px; padding-top: 90px;">No Data</div></td></tr>')
		}
	}

	function buildOptions(item){
		var html = [];

		html.push('<a type="button" class="btn btn-default btn-xs m5">编辑</a>')
		html.push('<a type="button" class="btn btn-danger btn-xs m5">删除</a>')
		
		if(item.example){
			html.push('<a type="button" href="', item.example ,'" target="_blank" class="btn btn-default btn-xs m5">测试</a>')
			html.push('<a type="button" href="', jsonpURL(item.example) ,'" target="_blank" class="btn btn-default btn-xs m5">jsonp</a>')
		}
		
		if(item.wiki){
			html.push('<a type="button" href="', item.wiki ,'" target="_blank" class="btn btn-default btn-xs m5">Wiki</a>')
		}

		return html.join("")
	}

	function jsonpURL(url){
		if(url && url.indexOf("?") != -1){
			return url + "&callback=jQuery" + Date.now();
		}
		else{
			return url + "?callback=jQuery" + Date.now();
		}
	}
});