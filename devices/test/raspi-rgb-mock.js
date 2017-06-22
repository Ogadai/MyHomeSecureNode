"use strict"

const EventEmitter = require('events'),
    	jpeg = require('jpeg-js'),
      fs = require('fs'),
      TEST_PATH = `${__dirname}/garage`

class RaspiRGBMock extends EventEmitter {
  constructor() {
    super()
    
    this.files = fs.readdirSync(TEST_PATH)
    this.index = 0;
    this.interval = null
  }
  start(camerSettings) {
    this.interval = setInterval(() => {
      const file = `${TEST_PATH}/${this.files[this.index]}`
      this.index = this.index + 1
      if (this.index >= this.files.length) this.index = 1

      try {
      const jpegData = fs.readFileSync(file),
           imageData = jpeg.decode(jpegData, true)

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
