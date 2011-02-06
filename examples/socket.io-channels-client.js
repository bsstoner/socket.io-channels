/****
* socket.io-channels client side class
*
* This is one example how you could build a class to 
* wrap socket.io and communicate with socket.io-channels 
* on the server.
*/

var SocketIOChannel = function(options){
  this.connected = false;
  this.eventHandlers = [];
	this.channelId = options.channelId || "defaultChannel";


  this.socket = new io.Socket(options.host || 'localhost',{
    port: options.port || 8000
  });


  this.socket.connect();


	var context = this;
	
  this.socket.on('connect', function(){
    context.connected = true;

    context._emit('connect',{});

    context._send('connectToChannel', {
      session: options.session
    });
	});
	
	this.socket.on('disconnect', function(){
    context.connected = false;

    var retry = options.reconnectOnDisconnect,
        retryEvery = options.reconnectRetryInterval || 30000;

    // publish the message so people know we got disconnected,
    // and if/when we're going to try to reconnect:

    context._emit('disconnect',{
      retry: retry,
      retryIn: retryEvery
    });

    // auto-reconnect, if option is set:
    if (retry){

      context.reconnectInterval = setInterval(function(){
        if (!context.connected){
          context._emit('connectionRetry',{
            retryIn: retryEvery
          });

          context.socket.connect();

        } else {
          clearInterval(context.reconnectInterval);
        }
      }, retryEvery);
    }
	})
	
	this.socket.on('message', function(data){
    context._receive(data);
  });
}

// Public method to publish an event with a
// message hash.  the message hash should have
// a channel attribute
SocketIOChannel.prototype.send = function(event, msg){
  msg = msg || {};
  this._send(event,msg);
}

// Public method for registeing event handlers
// that should be called when certain events
// are pushed to the browser
SocketIOChannel.prototype.on = function(event, closure){
  if(this.eventHandlers[event]){
    this.eventHandlers[event].push(closure);
  } else {
    this.eventHandlers[event] = [closure];
  }
};

SocketIOChannel.prototype._send = function(event, msg){
    console.log("sending message: ", event, msg);
    msg = msg || {};

    msg['event'] = event;
    msg['channelId'] = this.channelId;

    console.log("for realz",msg);
    this.socket.send(JSON.stringify(msg));
};

SocketIOChannel.prototype._emit = function(event, msg){
  if (this.eventHandlers[event]){
    this._executeCallbacks(this.eventHandlers[event],msg);
  }
}

SocketIOChannel.prototype._receive = function(msg){
    console.log("received message: ", msg);

    var parsed = JSON.parse(msg);

    if (!parsed || !parsed.event){
      return;
    }

    for(var p in parsed){
      if (typeof parsed[p] == "string"){
        parsed[p] = this.esc(parsed[p])
      }
    }

    this._emit(parsed.event,parsed);
}

SocketIOChannel.prototype.esc = function(msg){
  return msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

SocketIOChannel.prototype._executeCallbacks = function(callbacks, data){
  for(var i=0;i<callbacks.length;i++){
    callbacks[i](data);
  }
}

