"use strict"
const EventEmitter = require('events'),
  extend = require('extend'),
  VideoBuffer = require('./video/video-buffer'),
  Uploader = require('./uploader'),
  StillImage = require('./imaging/still-image')

const time = () => {
  return new Date().toISOString().split('T')[1]
}

const DEFAULT_OPTIONS = {
  bufferMilliseconds: 10000,
  clipMilliseconds: 30000
}

class VideoCamera extends EventEmitter {
  constructor(config, nodeName) {
    super()

    this.options = extend({}, DEFAULT_OPTIONS, config)
    this.nightMode = false
    this.states = { on: { _default: 'off' } }
    this.nodeName = nodeName

    this.motionTimeout = null
    this.modes = {
      motion: false,
      timelapse: false
    }
    this.snapshotPromise = null;

    this.videoBuffer = new VideoBuffer(this.options)
    this.videoBuffer.on('motion', () => this.onMotion())
    setTimeout(() => this.startVideo(), 1000)
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

    if (state === 'timelapse' && !this.snapshotPromise) {
      this.snapshotPromise = this.pauseForSnapshot().then(() => {
        this.snapshotPromise = null;
      })
    }
  }

  startVideo() {
    this.videoBuffer.startVideo(this.options.settings);
  }

  stopVideo() {
    return this.videoBuffer.stopVideo();
  }

  pauseForSnapshot() {
    return this.stopVideo().then(() => {
      this.captureSnapshot().then(() => {
        this.startVideo()
      })
    })
  }

  captureSnapshot() {
    return new Promise(resolve => {
      try {
        const stillImage = new StillImage()

        const options = { ...this.options.settings }
        delete options.framerate

        stillImage.capture(options)

        stillImage.on('image', image => {
          this.uploader.queueData(image)
          resolve()
        })
      } catch (ex) {
        console.error('Error capturing snapshot', ex)
        resolve()
      }
    })
  }

  onMotion() {
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout)
    } else {
      console.log(`start stream: ${time()}`)
      this.videoBuffer.startStream()
    }

    this.emit('changed', 'movement')

    this.motionTimeout = setTimeout(() => {
      console.log(`stop stream: ${time()}`)

      this.motionTimeout = null
      this.videoBuffer.stopStream()
    }, this.options.clipMilliseconds - this.options.bufferMilliseconds)
  }

  _test() {
    this.setState(this.modes.motion ? "off" : "timelapse")
  }
}
module.exports = VideoCamera
