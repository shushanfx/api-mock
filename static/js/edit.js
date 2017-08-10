$(function(){
	var $btnSubmit = $("#btnSubmit"),
		$isFilter = $("#chkIsFilter"),
		$type = $("#sltType"),
		$form = $($btnSubmit.get(0).from);

	var $content = $("#divContent"),
		codeContent = null,
		codeFilter = null;

	$btnSubmit.on("click", function(e){
		saveMock();
		e.preventDefault();
	});
	$isFilter.on("click", function(){
		var isChecked = this.checked;
		handleFilter(isChecked);
	});
	$type.on("change", function(){
		buildEditor();
	});

	getMock();

	function handleFilter(isChecked){
		var $div = $("#divFilter");
		if(isChecked){
			$div.show();
			if(!$div.attr("data-init")){
				$div.attr("data-init", "1");
				codeFilter = CodeMirror.fromTextArea($div.find("#txtFilter")[0], {
					mode: "javascript",
					lineNumbers: true,
					matchBrackets: true,
        			autoCloseBrackets: true
				});
			}
		}
		else{
			$div.hide();
		}
	}

	function getMock(){
		var url = $btnSubmit.attr("data-get-url"),
			id = $btnSubmit.attr("data-id");
		
		if(id){
			$.getJSON(url, {"_id": id}, function(result){
				if(result && result.data){
					rebuild(result.data);
					buildEditor();
				}
			});
		}
		else{
			buildEditor()
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
						$btnSubmit.attr("data-id", result.data._id);
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
		else{
			alert("请检查输入！");
		}
	}

	function buildEditor(){
		var type = $("[name='type']").val();
		var $content = $("[name='content']");

		if(codeContent){
			codeContent.toTextArea();
		}
		codeContent = CodeMirror.fromTextArea($content.get(0), {
			mode: type,
			lineNumbers: true,
			mode: type === "json" ? "application/ld+json" : type
		});
	}

	function buildObject(){
		var $forms = $content.find("form");
		var obj = {};
		
		if(codeContent){
			codeContent.save();
		}
		if(codeFilter){
			codeFilter.save();
		}

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
	function rebuild(data){
		var keys = null;
		if(data){
			keys = Object.keys(data);
			keys.forEach(function(item){
				try{
					var value = data[item];
					var $item = $("[name='"  + item + "']");
					if(item === "isFilter"){
						if($item && $item.length){
							$item[0].checked = value == 1;
						}
						handleFilter(value == 1);
					}
					else if(item === "filter"){
						if(codeFilter){
							codeFilter.setValue(value);
						}
						else{
							$item.val(value);
						}
					}
					else{
						if($item && $item.length){
							$item.val(value);
						}
					}
				}
				catch(e){
					console.dir(e);
				}
			});
		}
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