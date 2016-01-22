var events = require('events'),
    Gpio = require('./gpio');

function DeviceLed(config) {
    var self = this,
        gpio;

    if (Gpio) {
        gpio = new Gpio(config.gpio.pin, 'out');
    }

    self.setState = function (state) {
        if (gpio) {
            gpio.writeSync(state ? 1 : 0);
        }
    }
}
DeviceLed.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceLed;
