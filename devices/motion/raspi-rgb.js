"use strict"
const EventEmitter = require('events'),
    	extend = require('extend'),
      CameraProcess = require('../imaging/camera-process'),
      INFINITY_MS = 999999999

const DEFAULT_SETTINGS = { width: 256, height: 256, timelapse: 1000, timeout: INFINITY_MS }

class RaspiRGB extends EventEmitter {
  constructor(cameraType = 'yuv') {
    super()

    this.cameraProcess = new CameraProcess(cameraType)
    this.cameraProcess.on('stopped', () => this.cameraStopped())

    this.yuv = cameraType === 'yuv'
    this.buffer = null
  }

  start(cameraSettings) {
    this.cameraSettings = cameraSettings
    this.buffer = null

    const options = extend(DEFAULT_SETTINGS, cameraSettings)
    this.imageSize = options.width * options.height * 4
    const stdout = this.cameraProcess.start(options)

    stdout.on('data', data => this.onChunk(data));
  }

  onChunk(data) {
    if (!this.buffer) {
      this.buffer = Buffer.from(data)
    } else {
      this.buffer = Buffer.concat([this.buffer, Buffer.from(data)]);
    }

    if (this.yuv) {
      // TODO: the YUV format is obviously not just RGB, so this doesn't work
      if (this.buffer.length >= this.imageSize) {
        let extraBuffer
        if (this.buffer.length > this.imageSize) {
          extraBuffer = Buffer.from(this.buffer, this.imageSize, this.buffer.length - this.imageSize)
          this.buffer = Buffer.from(this.buffer, 0, this.imageSize)
        }
        this.onImage()
        this.buffer = extraBuffer
      }
    } else {
      if (data[data.length - 2] == 0xFF && data[data.length - 1] == 0xD9) {
        this.onImage()
      }
    }
  }

  onImage() {
    if (this.buffer) {
      const imageData = {
        width: this.cameraSettings.width,
        height: this.cameraSettings.height,
        data: this.buffer.buffer
      }
      this.buffer = null

      setTimeout(() => this.emit('image', imageData))
    }
  }

  stop() {
    return this.cameraProcess.stop()
  }

  cameraStopped() {
    setTimeout(() => this.startChild(), 5000)
  }
}
module.exports = RaspiRGB
