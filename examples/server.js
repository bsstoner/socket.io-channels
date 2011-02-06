/**
 * Important note: this application is not suitable for benchmarks!
 */

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('socket.io')
  , channels = require('../')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;

server = http.createServer(function(req, res){
  // your normal server code
  var path = url.parse(req.url).pathname;
  console.log(path)
  switch (path){
    case '/':
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('<h1>Welcome. Try <a href="/chat?room=1">Chat Room 1</a> or <a href="/chat?room=2">Chat Room 2</a>.</h1>');
      res.end();
      break;

    case '/json.js':
    case '/socket.io-channels-client.js':
      fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res);
        res.writeHead(200, {'Content-Type': 'text/javascript'})
        res.write(data, 'utf8');
        res.end();
      });
      break;

    case '/chat':
      fs.readFile(__dirname + '/chat.html', function(err, data){
        if (err) return send404(res);
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.write(data, 'utf8')
        res.end();
      });
      break;

    default: send404(res);
  }
}),

send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};

server.listen(8000);

// socket.io, I choose you
// simplest chat application evar
var socket = io.listen(server)
    channel = channels.listen(socket, {})

channel.on('connectedToChannel', function(client, sessionInfo){
  channel.broadcastToChannel('announcement',sessionInfo.channelId, {announcement: sessionInfo.session.username + " has entered the Room"})
})

channel.on('disconnectedFromChannel', function(sessionId, sessionInfo){
  channel.broadcastToChannel('announcement',sessionInfo.channelId, {announcement: sessionInfo.session.username + " has left the Room"})
})

channel.on('chat',function(client, msg){
  // broadcast the chat message to everyone in the channel,
  // except the person who sent it:
  channel.broadcastToChannel('chat', msg.channelId, msg, client.sessionId)
})
