var events = require('events'),
    Gpio = require('./gpio');

function DeviceLed(config) {
    var self = this,
        gpio;

    if (Gpio) {
        gpio = new Gpio(config.gpio.pin, 'out');

	this.disconnect = function() {
	    gpio.unexport();
        }
    }

    self.setState = function (state) {
        if (gpio) {
            gpio.writeSync(state === 'on' ? 1 : 0);
        }
    }
}
DeviceLed.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceLed;
