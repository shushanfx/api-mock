

var SocketIO = require("socket.io");
var exec = require("child_process").spawn;
var log4js = require("log4js");

var logger = log4js.getLogger("Socket");
var socketID = 0;

class MySocket extends Object {
  constructor(server, socket){
    super();
    socketID ++;
    this.id = socketID;
    this.server = server;
    this.socket = socket;
    this.lastLine = null;
  }
  destroy(){
    this.server.destroy(this);
  }
  init(){
    let me = this;
    this.socket.on('run', function(action){
      if(action){
        logger.info(`Run command: ${action}`)
        me.run(action);
      }
    });
    this.socket.on('disconnect', () => {
      logger.info(`Socket ${this.id} closed. (${me.server.list.length})`)
      this.close();
    });
    this.socket.on('stop', () => {
      logger.info(`Stop Action`);
      if(this.cmd){
        this.cmd.disconnect();
      }
    });
  }
  // handleAction(line){
  //   let result = /$\s*([^\s]+)/gi.exec(line);
  //   if(result){
  //     let action = result[1];
  //     switch(action){
  //       case 'run': 
  //       this.run(result.substring(result[0].length));
  //       break;
  //     }
  //   }
  // }
  run(command){
    if(this.cmd){
      this.cmd.disconnect();
    }
    let arg = command.split(' ');
    let com, args;
    if(arg.length >= 2) {
       com = arg[0];
       args = arg.slice(1);
    }
    else{
       com = arg[0];
       args = [];
    }
    this.cmd = exec(com, args, {
      windowsHide: true
    });
    this.cmd.stdout.on('data', (data) => {
      let str = data.toString();
      let lines = str.split('\n');
      lines.forEach((line, index) => {
        if(index === lines.length - 1){
          if(this.prevLine){
            this.prevLine += line;
          }
          else{
            this.prevLine = line;
          }
        }
        else if(index === 0){
          this.writeLine((this.prevLine || '') + line);
          this.prevLine = null;
        }
        else{
          this.writeLine(line);
        }
      });
    });
    this.cmd.stderr.on('data', (data) => {
      let str = data.toString();
      let lines = str.split('\n');
      lines.forEach((line, index) => {
        if(index === lines.length - 1){
          if(this.prevLine){
            this.prevLine += line;
          }
          else{
            this.prevLine = line;
          }
        }
        else if(index === 0){
          this.writeLine((this.prevLine || '') + line);
          this.prevLine = null;
        }
        else{
          this.writeLine(line);
        }
      });
    })
    this.cmd.on('close', (code) => {
      this.socket.emit('stop');
      this.cmd = null;
    })
    this.cmd.on('disconnect', () => {
      this.socket.emit('stop');
      this.cmd = null;
    });
    this.cmd.on('error', (err) => {
      this.writeLine(`System out with error: ${err}`);
    });
  }
  writeLine(line){
    this.socket.write(line + '\n');
  }
  close(){
    if(this.cmd){
      this.cmd.disconnect();
    }
    this.server.destroy(this);
  }
}

module.exports = {
  init(server){
    this.server = server;
    this.io = new SocketIO(server);
    this.listen();
    this.list = [];
    logger.info(`Socket server started.`);
  },
  listen(){
    let me = this;
    this.io.on("connection", function(socket){
      let s = new MySocket(me, socket);
      s.init();
      me.list.push(s);
      logger.info(`A connection connected with id ${s.id}/${me.list.length}`);
      s.writeLine('连接正常！');
    });
  },
  destroy(removedItem){
    let index = -1;
    for(let i = 0; i < this.list.length ; i++){
      let item = this.list[i];
      if(removedItem && removedItem.id === item.id){
        index = i;
        break;
      }
    }
    if(index >= 0){
      this.list.splice(index, 1);
    }
  }
}
