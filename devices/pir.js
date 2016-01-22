var events = require('events'),
    Gpio = require('./gpio');

function DevicePIR(config) {
    var self = this;

    if (Gpio) {
        var gpio = new Gpio(config.gpio.pin, 'in', 'both');
        gpio.watch(function (err, value) {
            if (err) {
                console.log(err);
            } else if (value === 1) {
                activate();
            }
        });
    }

    var timeout;
    function activate() {
        if (!timeout) {
            self.emit('changed', 'activated');
        } else {
            clearTimeout(timeout);
        }
        timeout = setTimeout(function () {
            self.emit('changed', 'reset');
            timeout = null;
        }, 5000);
    }

    this._test = function () {
        activate();
    };
}
DevicePIR.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DevicePIR;
