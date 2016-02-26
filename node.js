var WebSocketClient = require('websocket').client,
    events = require('events');

function Node(name, hubClient, deviceList) {
    var self = this;
    events.EventEmitter.call(this);

    hubClient
        .on('initialised', function () {
            hubClient.send({ method: 'initialise', name: name })
	        deviceList.reportInitialStates();
        })
        .on('settings', function (message) {
            deviceList.applySettings(message.settings)
        })
        .on('setState', function (data) {
            var device = deviceList.getDevice(data.name)
            if (device) {
                device.setState(data.state);
                console.log(data.name + ' switched to ' + data.state);
            } else {
                console.error('can\'t find device "' + data.name + '"');
            }
        });

    deviceList.on('devicechange', function (name, message) {
        console.log(name + ' ' + message);
        hubClient.send({ method: 'sensor', name: name, message: message });
    });

}
Node.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = Node;
