"use strict"
const EventEmitter = require('events'),
  extend = require('extend'),
  CameraProcess = require('../imaging/camera-process')

const DEFAULT_SETTINGS = { width: 256, height: 256 }

class StillImage extends EventEmitter {
  constructor() {
    super()

    this.cameraProcess = new CameraProcess('still')
    this.cameraProcess.on('stopped', () => this.cameraStopped())

    this.buffer = null
  }

  capture(cameraSettings) {
    this.buffer = null

    const options = extend(DEFAULT_SETTINGS, cameraSettings)
    const stdout = this.cameraProcess.start(options)
    stdout.on('data', data => this.onChunk(data))
  }

  onChunk(data) {
    if (!this.buffer) {
      this.buffer = Buffer.from(data)
    } else {
      this.buffer = Buffer.concat([this.buffer, Buffer.from(data)])
    }
  }

  cameraStopped() {
    this.emit('image', this.buffer)
  }
}
module.exports = StillImage
