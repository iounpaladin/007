var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    console.log(msg);
    io.emit('chat message', '<b>' + msg.player + '</b> says: ' + msg.msg);
  });

  socket.on('choice', function(choice){
    console.log(choice);
    io.emit('choice', choice);
    io.emit('chat message', '<span class="system">' + choice.player + ' has chosen!</span>')
  });

  //socket.emit('round start', 0);
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
