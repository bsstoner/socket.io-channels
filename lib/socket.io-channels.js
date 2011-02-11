var events = require('events')

var Channels = module.exports = function(socket, options){
  events.EventEmitter.call(this)

  // default, quick/dirty memory store, you can pass in
  // any Connect Session storage in options, i.e. connect-redis:
  this.store = function(){
    return {
      hash: {},
      get: function(key, fn){
        fn(null, this.hash[key])
      },
      set: function(key, val, fn){
        this.hash[key] = val;
        fn(null, this.hash[key])
      },
      destroy: function(key, fn){
        delete this.hash[key]
        fn()
      }
    }
  }()

  this.listen(socket, options)

  return this
}

Channels.super_ = events.EventEmitter;
Channels.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: Channels,
    enumerable: false
  }
})


Channels.prototype.listen = function(socket, options){
  this.socket = socket

  if (options.store) {
    this.store = options.store
  }

  var context = this;

  this.socket.on('connection', function(client){
    context.connect(client)

    client.on('message', function(msg){
      context.receive(client, msg)
    })

    client.on('disconnect', function(){
      context.disconnect(client)
    })
  })
}

Channels.prototype.connect = function(client){
  var context = this

  this.store.set(client.sessionId,null, function(err){
    context.emit('connected',client)
  })
}

Channels.prototype.disconnect = function(client){
  var context = this

  this.store.get(client.sessionId, function(err, sessionInfo){
    if (sessionInfo){
      context.disconnectFromChannel(client.sessionId, sessionInfo)
    }

    context.store.destroy(client.sessionId,function(err){
      context.emit('disconnected',client.sessionId)
    })
  })
}

Channels.prototype.receive = function(client, msg){
  var parsed = null, context = this;

  try {
    parsed = JSON.parse(msg)
  } catch(e){
    parsed = msg
  }

  if(!parsed.event){
    return;
  }

  if (parsed.event=="connectToChannel" && parsed.channelId){

    this.connectToChannel(client, parsed)

  } else if (parsed.event=="disconnectFromChannel" && parsed.channelId){

    this.store.get(client.sessionId, function(err, sessionInfo){
      context.disconnectFromChannel(client.sessionId, sessionInfo)
    })

  } else {

    this.emit(parsed.event,client,parsed)

  }

}

Channels.prototype.connectToChannel = function(client, msg){
  var context = this

  this.store.get(msg.channelId,function(err, channel){
    if (!channel){
      channel = {}
      context.emit('createdChannel',msg.channelId)
    }

    channel[client.sessionId] = msg

    context.store.set(msg.channelId, channel, function(err){
      context.store.set(client.sessionId, msg, function(){
        context.emit("connectedToChannel",client, msg, context.getChannelUsers(channel))
      })
    })
  })
}

Channels.prototype.disconnectFromChannel = function(sessionId, sessionInfo){
  var context = this

  this.store.get(sessionInfo.channelId,function(err, channel){
    delete channel[sessionId]

    if(channel=={}){
      context.store.destroy(sessionInfo.channelId,function(err){
        context.emit('deletedChannel',sessionInfo.channelId)
        context.emit('disconnectedFromChannel',sessionId,sessionInfo,[])
      })
    } else {
      context.store.set(sessionInfo.channelId,channel,function(err){
        context.emit('disconnectedFromChannel',sessionId,sessionInfo,context.getChannelUsers(channel))
      })
    }
  })
}

Channels.prototype.broadcastToChannel = function(event, channelId, msg, exclude){
  var context = this

  this.store.get(channelId,function(err, channel){

    if(channel){
      msg['event'] = event
      var stringMsg = JSON.stringify(msg)

      for(var u in channel){
        if (context.socket.clients[u]){
          var client = context.socket.clients[u]

          if ((exclude && client.sessionId != exclude) || !exclude) {
            client.send(stringMsg)
          }
        } else {

          // somehow there's someone in the channel that's not connected, shouldn't be possible,
          // but just in case, let's clean them up here:
          delete channel[u]

        }
      }

      context.store.set(channelId,channel,function(){
        context.emit("broadcastedToChannel",event,channelId,msg,exclude)
      })
    }
  })
}

Channels.prototype.getChannelUsers = function(channel){
  var users = []

  if (channel){
    for(var c in channel){
      users.push(channel[c])
    }
  }

  return users;
}
