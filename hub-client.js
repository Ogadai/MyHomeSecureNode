var WebSocketClient = require('websocket').client,
    events = require('events');

function HubClient(socketServer, socketPort) {
    var self = this,
        client = new WebSocketClient(),
        connection = null,
	pingInterval;
    events.EventEmitter.call(this);

    client
      .on('connectFailed', function (error) {
          console.log('Connect Error: ' + error.toString() + '. Attempting reconnect in 10 seconds');
          setTimeout(self.connect, 10000);
      })
      .on('connect', function (c) {
          console.log('Connection Open');
          connection = c;
	  pingInterval = setInterval(doPing, 10000);

          connection
            .on('error', function (error) {
                console.log('Connection Error: ' + error.toString());
            })
            .on('close', function () {
		closeConnection();
            })
            .on('message', function (message) {
                if (message.type = 'utf8') {
                    var data = JSON.parse(message.utf8Data);
                    self.emit(data.method, data);
                }
            })

          self.emit('initialised');
      })

	
    function doPing() {
	try {
	    self.send({ method: 'ping' });
	} catch (ex) {
	    console.log('Error pinging node server', ex);
	    closeConnection();
	}
    }
	
    function closeConnection() {
	clearInterval(pingInterval);
	
        console.log('Connection Closed. Attempting reconnect in 10 seconds');
        connection = null;
        setTimeout(self.connect, 10000);
    }

    this.send = function (data) {
        if (connection) {
	    connection.sendUTF(JSON.stringify(data));
	}
    }

    this.connect = function () {
        client.connect('ws://' + socketServer + ':' + socketPort, 'echo-protocol');
    }
}
HubClient.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = HubClient;
