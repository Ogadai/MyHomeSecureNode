var WebSocketClient = require('websocket').client,
    keypress        = require("keypress");

var client = new WebSocketClient(),
    socketPort = 45738;

client
  .on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
  })
  .on('connect', function(connection) {
    console.log('Connection Open');

    connection
      .on('error', function(error) {
        console.log('Connection Error: ' + error.toString());
      })
      .on('close', function() {
        console.log('Connection Closed');
      })
      .on('message', function(message) {
        if (message.type = 'utf8') {
          console.log('Received message "' + message.utf8Data + '"');
        }
      })

    var doorOpen = false;

    keypress(process.stdin);
    process.stdin.on('keypress', function(ch, key) {
      if (key) {
        switch(key.name) {
          case 'p':
            sendMessage({ method: 'sensor', name: 'pir', message: 'activated' });
            break;
          case 'd':
            doorOpen = !doorOpen;
            sendMessage({ method: 'sensor', name: 'door', message: doorOpen ? 'open' : 'closed' });
            break
          case 'c':
            if (key.ctrl) {
              process.exit(0);
            }
            break;
        }
      }
    });

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    sendMessage({ method: 'initialise', name: 'testnode' });

    function sendMessage(data) {
      var message = JSON.stringify(data);

      console.log('Sending message "' + message + '"')
      connection.sendUTF(message);
    }
  })

client.connect('ws://localhost:' + socketPort, 'echo-protocol');
