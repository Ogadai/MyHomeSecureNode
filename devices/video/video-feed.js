"use strict"
const EventEmitter = require('events'),
  extend = require('extend'),
  CameraProcess = require('../imaging/camera-process'),
  Splitter = require('stream-split'),
  INFINITY_MS = 999999999

const SEPARATOR = new Buffer([0,0,0,1]);
const DEFAULT_SETTINGS = { width: 256, height: 256, timeout: 0 }

class VideoFeed extends EventEmitter {
  constructor() {
    super()

    this.cameraProcess = new CameraProcess('video')
    this.cameraProcess.on('stopped', () => this.cameraStopped())

    this.buffer = null
  }

  start(cameraSettings) {
    this.buffer = null
    const splitter = new Splitter(SEPARATOR);

    const options = {...DEFAULT_SETTINGS, ...cameraSettings}
    const stdout = this.cameraProcess.start(options)

    stdout.pipe(splitter).on('data', data => this.onChunk(data));
  }

  stop() {
    return this.cameraProcess.stop()
  }

  onChunk(data) {
    this.emit('frame', Buffer.concat([SEPARATOR, data]))
  }

  cameraStopped() {
    setTimeout(() => this.start(), 5000)
  }
}
module.exports = VideoFeed
