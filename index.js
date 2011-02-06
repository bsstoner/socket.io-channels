exports.Channels = require('./lib/socket.io-channels')
exports.listen = function(socket, options){
  return new exports.Channels(socket, options)
}
