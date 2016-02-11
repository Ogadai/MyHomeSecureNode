var events = require('events'),
    Gpio = require('./gpio');

function DeviceDoor(config) {
    var self = this,
        open = true;

    if (Gpio) {
        var gpio = new Gpio(config.gpio.pin, 'in', 'both');

	open = gpio.readSync() !== 1;

        gpio.watch(function (err, value) {
            if (err) {
                console.log(err);
            } else {
                setState(value !== 1);
            }
        });

	this.disconnect = function() {
	    gpio.unexport();
        }
    }

    function setState(isOpen) {
        if (open !== isOpen) {
            open = isOpen;
            self.emit('changed', open ? 'open' : 'closed');
        }
    }

    this.reportInitialState = function() {
        self.emit('changed', open ? 'open' : 'closed');
    }

    this._test = function () {
        setState(!open);
    };

}
DeviceDoor.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceDoor;
