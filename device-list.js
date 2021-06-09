var events = require('events'),
    deviceType = {};

deviceType.pir = require('./devices/pir');
deviceType.door = require('./devices/door');
deviceType.led = require('./devices/led');
deviceType.rfid = require('./devices/rfid');
deviceType.camera = require('./devices/camera');
deviceType.camera2 = require('./devices/camera2');
deviceType.video = require('./devices/video');
deviceType.ipcam = require('./devices/ipcam');

function DeviceList(configList, nodeName) {
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

    this.applySettings = function (hubSettings) {
        for (var name in devices) {
            if (devices[name].applySettings) {
                devices[name].applySettings(hubSettings);
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
        if (!config.disabled) {
            var device = new deviceType[config.type](config, nodeName);
            device.on('changed', function (message) { deviceEvent(config.name, message); })
            devices[config.name] = device;

            console.log('Configured device "' + config.name + '"');
        }
    });

    function deviceEvent(name, message) {
        self.emit('devicechange', name, message);
    }

}
DeviceList.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceList;
