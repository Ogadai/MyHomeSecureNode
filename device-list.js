var events = require('events'),
    deviceType = {};

deviceType.pir = require('./devices/pir');
deviceType.door = require('./devices/door');
deviceType.led = require('./devices/led');
deviceType.rfid = require('./devices/rfid');

function DeviceList(configList) {
    var self = this,
        devices = {};

    this.getDevice = function (name) {
        return devices[name];
    }

    this.reportInitialStates = function() {
        for(var name in devices) {
	    if (devices[name].reportInitialState) {
		devices[name].reportInitialState();
	    }
	}
    }

    this.disconnectAll = function() {
        for(var name in devices) {
	    if (devices[name].disconnect) {
		devices[name].disconnect();
	    }
	}
    }

    configList.forEach(function (config) {
        var device = new deviceType[config.type](config);
        device.on('changed', function (message) { deviceEvent(config.name, message); })
        devices[config.name] = device;

        console.log('Configured device "' + config.name + '"');
    });

    function deviceEvent(name, message) {
        self.emit('devicechange', name, message);
    }

}
DeviceList.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceList;
