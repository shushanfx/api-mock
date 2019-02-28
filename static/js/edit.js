$(function () {
	var $btnSubmit = $("#btnSubmit"),
		$isFilter = $("#chkIsFilter"),
		$isBefore = $("#chkIsBefore"),
		$isContent = $("#chkIsContent"),
		$isProxy = $("#chkIsProxy"),
		$isNotRedirect = $("#chkIsNotRedirect"),
		$isNotTunnelHeader = $("#chkisNotTunnelHeader")
	$type = $("#sltType"),
		$form = $($btnSubmit.get(0).from);

	var $editArea = $("#divEditArea"),
		codeBefore = null,
		codeContent = null,
		codeFilter = null;

	$btnSubmit.on("click", function (e) {
		saveMock();
		e.preventDefault();
	});
	$isFilter.on("click", function () {
		var isChecked = this.checked;
		handleFilter(isChecked);
	});
	$isBefore.on("click", function () {
		handleBefore(this.checked);
	});
	$isContent.on("click", function () {
		handleContent(this.checked);
	});
	$isProxy.on("click", function () {
		handleProxy(this.checked);
	});
	$type.on("change", function () {
		handleContent($isContent.is(":checked"));
	});

	getMock();

	function handleFilter(isChecked) {
		var $div = $("#divFilter");
		if (isChecked) {
			$div.show();
			if (!$div.attr("data-init")) {
				$div.attr("data-init", "1");
				codeFilter = CodeMirror.fromTextArea($div.find("#txtFilter")[0], {
					mode: "javascript",
					lineNumbers: true,
					matchBrackets: true,
					autoCloseBrackets: true
				});
			}
		} else {
			$div.hide();
		}
	}

	function handleContent(isChecked) {
		var $div = $("#divContent");
		if (isChecked) {
			$div.show();
			var type = $("[name='type']").val();
			var $content = $("[name='content']");
			if (codeContent) {
				codeContent.toTextArea();
			}
			codeContent = CodeMirror.fromTextArea($content.get(0), {
				mode: type,
				lineNumbers: true,
				mode: type === "json" ? "application/ld+json" : type
			});
		} else {
			$div.hide();
		}
	}

	function handleBefore(isChecked) {
		var $div = $("#divBefore");
		if (isChecked) {
			$div.show();
			if (!$div.attr("data-init")) {
				$div.attr("data-init", "1");
				codeBefore = CodeMirror.fromTextArea($div.find("#txtBefore")[0], {
					mode: "javascript",
					lineNumbers: true,
					matchBrackets: true,
					autoCloseBrackets: true
				});
			}
		} else {
			$div.hide();
		}
	}

	function handleProxy(isChecked) {
		var $div = $("#divProxy");
		if (isChecked) {
			$div.show();
		} else {
			$div.hide();
		}
	}

	function getMock() {
		var url = $btnSubmit.attr("data-get-url"),
			id = $btnSubmit.attr("data-id");

		if (id) {
			$.getJSON(url, {
				"_id": id
			}, function (result) {
				if (result && result.data) {
					rebuild(result.data);
				}
			});
		} else {
			$isContent[0] && ($isContent[0].checked = true);
			handleContent(true);
		}
	}

	function saveMock() {
		var url = $btnSubmit.attr("data-save-url"),
			id = $.trim($btnSubmit.attr("data-id"));

		var obj = buildObject();
		if (id) {
			obj._id = id;
		}
		if (checkObject(obj)) {
			$.ajax({
				url: url,
				data: obj,
				method: "put",
				timeout: 2000,
				success: function (result) {
					if (result && result.code == 1) {
						alert("操作成功");
						$btnSubmit.attr("data-id", result.data._id);
						window.close();
					} else {
						alert("操作失败！");
					}
				},
				error: function () {
					alert("操作失败！")
				}
			});
		} else {
			alert("请检查输入！");
		}
	}

	function buildObject() {
		var $forms = $editArea.find("form");
		var obj = {};
		if (codeContent) {
			codeContent.save();
		}
		if (codeFilter) {
			codeFilter.save();
		}
		if (codeBefore) {
			codeBefore.save();
		}
		$forms.each(function (index, item) {
			var tmp = $(item).serializeArray();
			if (tmp && $.isArray(tmp)) {
				$.each(tmp, function () {
					var name = this.name;
					obj[name] = $.trim(this.value);
				});
			}
		});
		obj.isFilter = $isFilter.is(":checked") ? "1" : "0";
		obj.isContent = $isContent.is(":checked") ? "1" : "0";
		obj.isBefore = $isBefore.is(":checked") ? "1" : "0";
		obj.isProxy = $isProxy.is(":checked") ? "1" : "0";
		obj.isNotRedirect = $isNotRedirect.is(":checked") ? "1" : "0";
		obj.isNotTunnelHeader = $isNotTunnelHeader.is(":checked") ? "1" : "0";
		return obj;
	}


	function rebuild(data) {
		if (data) {
			Object.keys(data).forEach(function (item) {
				try {
					var value = data[item];
					var $item = $("[name='" + item + "']");
					if ($item && $item.length > 0) {
						if (item === "isFilter" || item === "isContent" ||
							item === "isBefore" || item === "isProxy" ||
							item === "isNotRedirect" || item === "isNotTunnelHeader") {
							$item[0].checked = value == 1;
						} else {
							$item.val(value);
						}
					}
				} catch (e) {
					console.dir(e);
				}
			});
		}
		handleBefore(data && data.isBefore == 1);
		handleContent(data && data.isContent == 1);
		handleFilter(data && data.isFilter == 1);
		handleProxy(data && data.isProxy == 1);
	}

	function checkObject(obj) {
		if (obj && obj.name) {
			if (obj.port && obj.path && obj.type) {
				return true;
			}
		}
		return false;
	}

});