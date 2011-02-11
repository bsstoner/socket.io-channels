# socket.io-channels

  Simple plugin for node.js/socket.io to enable multi-channel messaging.

  I've been reusing this piece of functionality in several apps, so it
seems to make sense to break it off into a reusable module

## Example

    var io = require('socket.io')
      , channels = require('socket.io-channels')
      , http = require('http');

    var server = http.createServer();

    server.listen(8000);

    var socket = io.listen(server)
      , channel = channels.listen(socket, {})

    channel.on('connectedToChannel', function(client, sessionInfo){
      channel.broadcastToChannel(
        'announcement',
        sessionInfo.channelId, 
        {announcement: sessionInfo.session.username + " has entered the Room"}
      )
    })

    channel.on('disconnectedFromChannel', function(sessionId, sessionInfo){
      channel.broadcastToChannel(
        'announcement',
        sessionInfo.channelId, 
        {announcement: sessionInfo.session.username + " has left the Room"}
      )
    })

    channel.on('chat',function(client, msg){
      channel.broadcastToChannel('chat', msg.channelId, msg, client.sessionId)
    })

    // you can still use socket as normal, without channels
    socket.on('connection',function(client){
      // add stuff here...
    })

Check out the included example in the project, for a modified version of
the socket.io chat example that adds multi-channel functionality.

## socket.io-channels is

  - A 'plugin' for socket.io.  It's meant to live alongside socket.io not
wrap it completely.

  - Pretty simple to add onto an existing socket.io implementation, and
turn on per-channel messaging

  - Trying to just add multi-channel message delivery, and stay out of the way to let you do whatever else you want on top of socket.io.

## socket.io-channels is not

  - Compliant with any standards like [bayeux](http://svn.cometd.com/trunk/bayeux/bayeux.html).  It's simple and met the current use cases I have.

  - Secure.  You need to implement your own authentication or security
protocol either by attaching to the events emitted by socket.io or
socket.io-channels.

  - Persistent.  It provides simple built-in in-memory channel/session storage, with the option of passing another store (i.e. connect-redis)

  (If you're looking for a more full featured multi-channel socket.io solution,
check out [Push-It](https://github.com/aaronblohowiak/Push-It) or [Juggernaut](https://github.com/maccman/juggernaut))

## Questions / Need Help?
  I like node and I like making real time/interactive javascript apps, hit me up:

  bsstoner@gmail.com (@bsstoner)
