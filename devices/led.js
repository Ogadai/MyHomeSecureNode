var events = require('events'),
    Gpio = require('./gpio');

function DeviceLed(config) {
    var self = this,
        gpio,
	states = {
	   on: false,
	   flash: false,
	   blink: false
	},
	currentState = false;

    if (Gpio) {
        gpio = new Gpio(config.gpio.pin, 'out');

	this.disconnect = function() {
	    gpio.unexport();
        }
    }

    var flashTimer,
	blinkTimer;
    self.setState = function (state) {
	if (state === 'on') {
	    states.on = true;
	} else if (state === 'off') {
	    states.on = false;
	} else if (state === 'flashon') {
	    if (!flashTimer) {
		flashTimer = setInterval(function() {
		    states.flash = !states.flash;
		    updateState();
		}, 250);
	        states.flash = true;
	    }
	} else if (state === 'flashoff') {
	    if (flashTimer) {
		clearInterval(flashTimer);
		flashTimer = null;
	    }
	    states.flash = false;
	} else if (state === 'blink') {
	    if (blinkTimer) clearTimeout(blinkTimer);
	    blinkTimer = setTimeout(function() {
	        states.blink = false;
		blinkTimer = null;
		updateState();
	    }, 1000);
	    states.blink = true;
	}

	updateState();
    }

    function updateState(){
	var newState = states.on || states.flash || states.blink;
	if (newState !== currentState) {
	    currentState = newState;

            if (gpio) {
                gpio.writeSync(currentState ? 1 : 0);
            }
	}

    }
}
DeviceLed.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceLed;
