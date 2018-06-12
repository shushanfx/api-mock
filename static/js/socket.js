function MySocket(host, port) {
  this.host = host;
  this.port = port;
  this.$btn = $("#btnStart").hide();
  this.$list = $("#ulList");
  this.$btnClear = $("#btnClear");

  this.socket = null;
  this.bindEvent();
  this.start();
}

MySocket.prototype.start = function () {
  var $btn = this.$btn;
  var $list = this.$list;
  var me = this;
  var socket = io(location.protocol + "//" + this.host + (this.port > 0 ? (":" + this.port) : ""), {
    autoConnect: false
  });
  this.appendLine("正在连接...");
  socket.on("connect", function () {
    $btn.removeClass("disabled");
    me.appendLine('连接成功！');
    me.$btn.click();
  });
  socket.on("disconnect", function () {
    $btn.addClass("disabled");
    me.appendLine('连接失败！');
  });
  socket.on("message", function (msg) {
    me.appendLine(msg)
  });
  socket.on("stop", function () {
    me.appendLine('程序运行完毕');
  });
  this.socket = socket;
  socket.open();
}

MySocket.prototype.appendLine = function (line) {
  var $list = this.$list;
  var $li = $('<li>' + line + '</li>');
  $list.append($li);
  if (this.isScrollTo) {
    $list[0].scrollTop = $li[0].offsetTop;
  }
};

MySocket.prototype.clear = function(){
  this.$list.empty();
  this.appendLine('');
}

MySocket.prototype.bindEvent = function () {
  var me = this;
  this.$btn.on("click", function (e) {
    var text = $(this).text().trim();
    e.preventDefault();
    if($(this).hasClass("disabled")){
      return ;
    }
    if (text === "开始") {
      me.run('pm2 log mock');
    } else {
      me.stop();
    }
  });
  this.$btnClear.on("click", function(e){
    me.clear();
    e.preventDefault();
  });
  $(document).on("keydown", function (e) {
    if (e.keyCode == 13) {
      me.appendLine('');
    }
  });

}

MySocket.prototype.run = function (action) {
  if (this.socket) {
    this.socket.emit("run", action);
  }
}

MySocket.prototype.stop = function () {
  if (this.socket) {
    this.socket.emit("stop");
  }
}
