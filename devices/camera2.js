"use strict"
const EventEmitter = require('events'),
    RaspiRGB = require('./motion/raspi-rgb'),
    RaspiRGBMock = require('./test/raspi-rgb-mock'),
    Motion = require('./motion/motion'),
    Uploader = require('./uploader')

class DeviceCamera extends EventEmitter {
    constructor(config, nodeName) {
        super()
        this.nightMode = false
        this.states = { on: { _default: 'off' } }
        this.modes = {
            motion: false,
            timelapse: false
        }
        this.nodeName = nodeName

        this.onImage = this.onImage.bind(this)
        this.motion = config.motion ? new Motion(config.motion) : null

        this.raspiRGB = config.mock ? new RaspiRGBMock() : new RaspiRGB('still')
        this.raspiRGB.on('image', this.onImage)
        
        setTimeout(() => this.raspiRGB.start(config.settings), 1000)
    }

    applySettings(settings) {
        this.uploader = new Uploader(settings, this.nodeName)
    }

    setState(state) {
		const index = state.indexOf('.');

		if (index !== -1) {
			const name = state.substring(0, index),
				value = state.substring(index + 1);

			this.states.on[name] = value;
		} else if (state == 'night') {
			this.nightMode = true;
		} else if (state == 'day') {
			this.nightMode = false;
	    } else {
            this.states.on._default = state;
	    }
        
        const modes = {
            motion: false,
            timelapse: false
        }

        for(let name of Object.keys(this.states.on)) {
            const newValue = this.states.on[name];
            modes[newValue] = true
        }
        this.modes = modes
    }

    onImage(imageData) {
        if (this.motion) {
            const motionDetected = this.motion.checkJpeg(imageData)
            if (motionDetected && this.modes.motion) {
                this.emit('changed', 'movement')
            }
        }

        if (this.modes.timelapse && this.uploader) {
            this.uploader.queueData(Buffer.from(imageData.data))
        }
    }

	_test() {
		this.setState(this.modes.motion ? "off" : "motion")
	}
}
module.exports = DeviceCamera
