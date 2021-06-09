"use strict"
const http = require('http');
const WebSocketServer = require('websocket').server;
const getIP = require('./get-ip');
const Stream = require('./stream');

class SocketServer {
    constructor(hubClient, deviceList, settings) {
        this.hubClient = hubClient;

        this.camera = deviceList.getDevice(settings.device);
        if (!this.camera) {
            console.warn(`Couldn't find stream device "${settings.device}"`)
        }
        this.settings = settings;

        const ip = getIP();
        const port = settings.port || 8081;
        const address = `ws://${ip}:${port}`;
        this.address = address;

        if (this.camera.type === 'jsmp') {
          this.initialiseJsmp(settings.port);
        } else {
          this.initialiseCam(port);
        }
    }

    initialiseCam(port) {
      const server = http.createServer((req, res) => {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write('Listening for Web Socket connections');
        res.end();
      });
      server.listen(port, () => {
          this.hubClient.send({ method: 'websocket', status: 'started', address: this.address, name: this.settings.name, type: 'cam' });
          console.log(`Listening for connections at ${this.address}`);
      });
      
      const wsServer = new WebSocketServer({
          httpServer: server,
          autoAcceptConnections: false
      });
      wsServer.on('request', request => this.onRequest(request));

      this.hubClient.on('initialised', () => {
        this.hubClient.send({ method: 'websocket', status: 'started', address: this.address, name: this.settings.name, type: 'cam' });
      });
    }

    initialiseJsmp(port) {
      this.camera.initialise(port);

      this.hubClient.send({ method: 'websocket', status: 'started', address: this.address, name: this.settings.name, type: 'jsmp' });
      console.log(`Listening for connections at ${this.address}`);
      
      this.hubClient.on('initialised', () => {
        this.hubClient.send({ method: 'websocket', status: 'started', address: this.address, name: this.settings.name, type: 'jsmp' });
      });
    }
    
    close() {
        this.hubClient.send({ method: 'websocket', status: 'stopped', address: this.address });
        console.log('Stopped listening');
    }

    onRequest(request) {
        console.log(`Web Socket ${this.settings.port} opened from ${request.origin}`);
        let connection = request.accept('echo-protocol', request.origin);
        let stream = this.camera ? new Stream(this.camera) : null;

        connection.on('message', message => {
          if (message.type === 'utf8') {
            try {
              const decodedMsg = JSON.parse(message.utf8Data);
              if (stream && decodedMsg.name === 'camera' && decodedMsg.state) {
                stream.setState(decodedMsg.state);
              }
            } catch(e) {
              console.error('error processing message: ', message.utf8Data);
              console.error(e);
            }
          }
          else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
          }
        });

        connection.on('close', (reasonCode, description) => {
          console.log('Web Socket disconnected.');
          if (stream) stream.close();
      
          connection = null;
        });

        if (stream) {
          stream.on('settings', settings => {
            const message = {
              name: 'camera',
              event: 'settings',
              content: settings
            };
            console.log('sending settings', JSON.stringify(settings))
            connection.sendUTF(JSON.stringify(message));
          });

          stream.on('frame', frame => {
            connection.sendBytes(frame)
          })

          stream.on('motion', () => {
            const message = {
              name: 'camera',
              event: 'motion'
            };
            connection.sendUTF(JSON.stringify(message));
          })
        }
    }
}
module.exports = SocketServer;
