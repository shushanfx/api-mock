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
			projectID = $.trim($("#txtProject").val()),
			path = $.trim($("#txtPath").val());
		var pageIndex = $.trim($("#txtPageIndex").val()),
			pageSize = $.trim($("#txtPageSize").val());

		if(url){
			$.ajax({
				url: url, 
				data: {
					name: name,
					host: domain,
					path: path,
					project: projectID || "",
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

	function onHandleRemove(mockId){
		$.ajax({
			url: mock.uri("be/del"),
			data: {_id: mockId},
			method: "delete",
			timeout: 2000,
			success: function(result){
				if(result && result.code == 1){
					getList();
				}
				else{
					alert("操作失败！");
				}
			},
			error: function(){
				alert("操作失败！")
			}
		});
	}

	function buildList(result){
		var show = function(str){
			if(typeof str === "string"){
				return str.split(",").map(function(value){
					return "<p>" + value + "<p>";
				}).join("");
			}
			return "-";
		}

		if(result && result.data && result.data.list && result.data.list.length > 0){
			$table.find("tr").filter(":gt(0)").remove();
			var html = [];
			var count = (result.data.pageIndex - 1) * result.data.pageSize
			$.each(result.data.list, function(index, item){
				html.push("<tr>");
				html.push("<td>", ++count , "</td>")
				html.push("<td>", item.name, "</td>");
				html.push("<td>", show(item.project), "</td>");
				html.push("<td>", show(item.host), "</td>");
				html.push("<td>", item.path, "</td>");
				html.push("<td>", item.type, "</td>");
				html.push("<td style='width:10%;'>")
				html.push(item.isBefore == 1 ? '<span class="label label-primary" style="margin-right:5px;" title="前置操作">onBefore</span>' : '');
				html.push(item.isContent == 1 ? '<span class="label label-primary" style="margin-right:5px;" title="自定义数据">content</span>' : '');
				html.push(item.isProxy == 1 ? '<span class="label label-primary" style="margin-right:5px;" title="' + item.proxy + '">proxy</span>' : '');
				html.push(item.isFilter == 1 ? '<span class="label label-primary" style="margin-right:5px;" title="后置过滤">onFilter</span>' : '');
				html.push("</td>");
				html.push("<td>", buildOptions(item), "</td>");
				html.push("</tr>");
			});
			$table.append(html.join(""));
			$table.find(".j_del").on("click", function(e){
				if(confirm("Sure to delete this item? ")){
					onHandleRemove($(this).attr("data-id"));
				}
				e.preventDefault();
			});
			buildPage(result.data.pageIndex * 1, result.data.pageSize * 1, result.data.total * 1);
		}
		else{
			$table.find("tr").filter(":gt(0)").remove();
			$table.append('<tr><td colspan="8"><div class="text-center" style="height:200px; padding-top: 90px;">No Data</div></td></tr>');
			buildPage(null);
		}
	}

	function buildOptions(item){
		var html = [];
		var example = item.example;
		var url = "";
		var getHost = function(str){
			if(typeof str === "string"){
				return str.split(",")[0]
			}
			return "";
		};
		var buildLocalURL = function(){
			var arr = [mock.uri("test"), "?mock-host=", encodeURIComponent(getHost(item.host))];
			arr.push("&mock-path=", encodeURIComponent(example));
			if(item.port != 80){
				arr.push("&mock-port=", item.port);
			}
			return arr.join("");
		}

		if(!example){
			example = item.path;
		}
		url = ["http://", getHost(item.host), item.port == 80 ? "" : item.port, example].join("");

		html.push('<a href="', mock.uri("edit") + "?_id=" + item["_id"] ,'" target="_blank" type="button" class="btn btn-default btn-xs m5">编辑</a>')
		html.push('<button data-id="', item._id ,'" type="button" class="btn btn-danger btn-xs m5 j_del">删除</button>')
		if(example){
			html.push('<a type="button" href="', buildLocalURL(),'" target="_blank" class="btn btn-default btn-xs m5">本地测试</a>')
			html.push('<a type="button" href="', jsonpURL(buildLocalURL()) ,'" target="_blank" class="btn btn-default btn-xs m5">本地jsonp</a>')
			html.push('<a type="button" href="', url ,'" target="_blank" class="btn btn-default btn-xs m5">Host测试</a>')
			html.push('<a type="button" href="', jsonpURL(url) ,'" target="_blank" class="btn btn-default btn-xs m5">Host jsonp</a>')
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

	function buildPage(pageIndex, pageSize, total){
		var $pager = $("#divPager");
		var html = [];
		var pageTotal = Math.ceil(pageTotal / pageSize);

		if(!pageIndex || isNaN(pageIndex)){
			$pager.hide();
		}
		else{
			$pager.show();
			html.push(getPageSelect(pageSize));
			html.push(getPagePager(pageIndex, pageSize, total))
			html.push(getPageInfo(pageIndex, pageSize, total));
			$pager.html(html.join(""));
			$pager.find("select").on("change", function(){
				$("#txtPageSize").val(this.value);
				getList();	
			});
			$pager.find("a").on("click", function(e){
				var $target = $(this);
				if(!$target.hasClass(".disabled")){
					$("#txtPageIndex").val($target.attr("data-index"));
					getList();
				}
				e.preventDefault();
			});
		}
	}

	function getPageSelect(pageSize){
		var arr = [];
		var list = [10, 20, 50];

		arr.push('<div class="col-md-2"><div style="line-height:34px;height:34px;">')
		arr.push('Page size: ')
		arr.push('<select>')
		list.forEach(function(item){
			var selected = '';
			if(item == pageSize){
				selected = 'selected';
			}
			arr.push('<option value="', item ,'" ', selected, '>', item, '</option>')
		});
		arr.push('</select>')
		arr.push('</div></div>')
		return arr.join('');
	}

	function getPagePager(pageIndex, pageSize, total){
		var arr = [];
		var pageTotal = Math.ceil(total / pageSize);
		var printItem = function(index, isDisabled){
			arr.push('<li', (isDisabled ? ' class="active"' : '') ,'><a href="javascript:void(0);" data-index="', index , '"', isDisabled ? ' class="disabled"' : ''  ,'>', index ,'</a></li>');
		}
		var printSpan = function(){
			arr.push('<li><span>...<span></li>')
		}
		var i = 0;

		arr.push('<div class="col-md-7" style="text-align:center">')
		arr.push('<ul class="pagination" style="margin:0;">')
		if(pageTotal > 6){
			if(pageIndex == 1){
				printItem(1, true);
			}
			else{
				arr.push('<li><a href="javascript:void(0);" data-index="', pageIndex - 1 , '" aria-label="Previous"><span aria-hidden="true">«</span></a></li>');
				printItem(1);
			}
		}
		if(pageTotal > 6){
			if(pageIndex <= 3){
				// 前置
				for(i = 2; i <= 4; i ++){
					printItem(i, i == pageIndex);
				}
				printSpan();
			}
			else if(pageIndex >= pageTotal - 2){
				// 后置
				printSpan();
				for(i = pageTotal - 3; i < pageTotal; i++){
					printItem(i, i == pageIndex);
				}
			}
			else{
				printSpan();
				for( i = pageIndex - 1; i <= pageIndex + 1; i ++){
					printItem(i, i == pageIndex);
				}
				printSpan();
			}
		}
		else{
			for(i = 1; i <= pageTotal; i ++){
				printItem(i, pageIndex == i);
			}
		}

		if(pageTotal > 6){
			if(pageIndex == pageTotal){
				printItem(pageTotal, true);
			}
			else{
				arr.push('<li><a href="javascript:void(0);" data-index="', pageTotal , '">', pageTotal ,'</a></li>')
				arr.push('<li><a href="javascript:void(0);" data-index="', pageIndex + 1 , '" aria-label="Next"><span aria-hidden="true">»</span></a></li>');
			}
		}

		arr.push('</ul>')
		arr.push('</div>');
		return arr.join('');
	}

	function getPageInfo(pageIndex, pageSize, total){
		var start = pageSize * (pageIndex - 1) + 1;
		var end = Math.min(pageSize * pageIndex, total);
		var arr = ['<div class="col-md-3"><div  style="line-height:34px;height:34px;">'];
		arr.push('Record(s) from ', start, ' to ', end, ', total ', total);
		arr.push('</div></div>');
		return arr.join("");
	}
});