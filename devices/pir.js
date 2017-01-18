var events = require('events'),
    Gpio = require('./gpio');

function DevicePIR(config) {
    var self = this;
    var timeout;

    if (Gpio) {
        var gpio = new Gpio(config.gpio.pin, 'in', 'both');
        gpio.watch(function (err, value) {
            if (err) {
                console.log(err);
	    } else if (value == 1) {
		if (timeout) {
		    self.emit('changed', 'activated');
		    clearTimeout(timeout);
		    timeout = null;
		} else {
		    timeout = setTimeout(function () {
        		timeout = null;
	            }, 20);
		}
	    } else {
		if (!timeout) {
		    self.emit('changed', 'reset');
		}
	    }
        });

	this.disconnect = function() {
	    gpio.unexport();
        }
    }

    this._test = function () {
        if (!timeout) {
            self.emit('changed', 'activated');
        } else {
            clearTimeout(timeout);
        }
        timeout = setTimeout(function () {
            self.emit('changed', 'reset');
            timeout = null;
        }, 5000);
    };
}
DevicePIR.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DevicePIR;
