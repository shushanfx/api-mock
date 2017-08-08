$(function(){
	var $btnSubmit = $("#btnSubmit"),
		$isFilter = $("#chkIsFilter"),
		$form = $($btnSubmit.get(0).from);

	var $content = $("#divContent");

	$btnSubmit.on("click", function(e){
		saveMock();
		e.preventDefault();
	});
	$isFilter.on("click", function(){
		var isCheck = this.checked;
		if(isCheck){
			$("#divFilter").show();
		}
		else{
			$("#divFilter").hide();
		}
	});

	getMock();

	function getMock(){
		var url = $btnSubmit.attr("data-get-url"),
			id = $btnSubmit.attr("data-id");
		
		if(id){
			$.getJSON(url, {"_id": id}, function(result){
				if(result && result.data){
					rebuild(result.data);
				}
			});
		}
	}
	function saveMock(){
		var url = $btnSubmit.attr("data-save-url"),
			id = $.trim($btnSubmit.attr("data-id"));

		var obj = buildObject();
		if(id){
			obj._id = id;
		}
		if(checkObject(obj)){
			console.dir(obj);
			$.ajax({
				url: url,
				data: obj,
				method: "put",
				timeout: 2000,
				success: function(result){
					if(result && result.code == 1){
						alert("操作成功");
						window.close();
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
	}

	function buildObject(){
		var $forms = $content.find("form");
		var obj = {};
		
		$forms.each(function(index, item){
			var tmp = $(item).serializeArray();
			if(tmp && $.isArray(tmp)){
				$.each(tmp, function(){
					var name = this.name;
					obj[name] = this.value;
				});
			}
		});
		obj.isFilter = $isFilter.is(":checked") ? "1" : "0";
		return obj;
	}
	function rebuild(){

	}

	function checkObject(obj){
		if(obj && obj.name){
			if(obj.port && obj.path && obj.type){
				return true;
			}
		}
		return false;
	}

});