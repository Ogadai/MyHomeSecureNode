"use strict"

const EventEmitter = require('events'),
    	jpeg = require('jpeg-js'),
      fs = require('fs'),
      TEST_PATH = `${__dirname}/garage`

class RaspiRGBMock extends EventEmitter {
  constructor(cameraType) {
    super()
    
    this.files = fs.readdirSync(TEST_PATH)
    this.index = 0;
    this.interval = null
    this.decode = !cameraType || cameraType === 'yuv'
  }
  start(cameraSettings) {
    this.interval = setInterval(() => {
      const file = `${TEST_PATH}/${this.files[this.index]}`
      this.index = this.index + 1
      if (this.index >= this.files.length) this.index = 1

      try {
        const jpegData = fs.readFileSync(file)
        const imageData = this.decode ? jpeg.decode(jpegData, true) : jpegData

        this.emit('image', imageData)
      } catch(e) {
        console.error(e)
      }
    }, 1000)
  }

  stop() {
    return new Promise(resolve => {
      setTimeout(() => {
        if (this.interval) {
          clearInterval(this.interval)
          this.interval = null

          resolve()
        }
      }, 1000)
    })
  }
}
module.exports = RaspiRGBMock
