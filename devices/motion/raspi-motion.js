"use strict"
const EventEmitter = require('events'),
    	extend = require('extend'),
      RaspiRGB = require('./raspi-rgb'),
      RaspiRGBMock = require('../test/raspi-rgb-mock'),
      Motion = require('./motion')

class RaspiRGBMotion extends EventEmitter {
  constructor(config) {
    super()

    this.config = config
    this.onImage = this.onImage.bind(this)
    this.raspiRGB = config.mock ? new RaspiRGBMock() : new RaspiRGB()
  }

  start() {
    const cameraSettings = this.getCameraSettings()
    this.motion = new Motion(this.config.motion)

    this.raspiRGB.on('image', this.onImage)
    this.raspiRGB.start(cameraSettings)
  }

  stop() {
    // Returns promise
    this.raspiRGB.removeListener('image', this.onImage)
    return this.raspiRGB.stop()
  }

  onImage(imageData) {
    if (this.motion) {
      const motionDetected = this.motion.checkRGB(imageData)
      if (motionDetected) {
        this.emit('motion')
      }
    }
  }

	getCameraSettings() {
		return extend({},
      this.config.settings,
      this.config.timelapseSettings,
      this.config.motionSettings
    )
	}
  
}
module.exports = RaspiRGBMotion
