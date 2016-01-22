var WebSocketClient = require('websocket').client,
    events = require('events');

function HubClient(socketPort) {
    var self = this,
        client = new WebSocketClient()
        connection = null;
    events.EventEmitter.call(this);

    client
      .on('connectFailed', function (error) {
          console.log('Connect Error: ' + error.toString() + '. Attempting reconnect in 10 seconds');
          setTimeout(self.connect, 10000);
      })
      .on('connect', function (c) {
          console.log('Connection Open');
          connection = c;

          connection
            .on('error', function (error) {
                console.log('Connection Error: ' + error.toString());
            })
            .on('close', function () {
                console.log('Connection Closed. Attempting reconnect in 10 seconds');
                connection = null;
                setTimeout(self.connect, 10000);
            })
            .on('message', function (message) {
                if (message.type = 'utf8') {
                    var data = JSON.parse(message.utf8Data);
                    self.emit(data.method, data);
                }
            })

          self.emit('initialised');
      })

    this.send = function (data) {
        connection.sendUTF(JSON.stringify(data));
    }

    this.connect = function () {
        client.connect('ws://localhost:' + socketPort, 'echo-protocol');
    }
}
HubClient.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = HubClient;
