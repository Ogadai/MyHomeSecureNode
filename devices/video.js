"use strict"
const EventEmitter = require('events'),
  extend = require('extend'),
  VideoBuffer = require('./video/video-buffer'),
  Uploader = require('./uploader'),
  GoogleDrive = require('../google/google-drive'),
  StillImage = require('./imaging/still-image'),
  FfmpegStill = require('./imaging/ffmpeg-still')

const time = () => {
  return new Date().toISOString().split('T')[1]
}

const DEFAULT_OPTIONS = {
  useFfmpeg: false,
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
    this.snapshotPromise = null

    this.streamTargets = {}
    this.streamUpload = false

    this.videoBuffer = new VideoBuffer(this.options)
    this.videoBuffer.on('motion', () => this.onMotion())
    setTimeout(() => this.startVideo(), 1000)

    if (config.useFfmpeg) {
      this.ffmpegStill = new FfmpegStill()
      this.ffmpegStill.on('image', image => this.onTimelapseImage(image))
    }
  }

  applySettings(settings) {
    this.uploader = new Uploader(settings, this.nodeName)

    if (settings.drive && settings.drive.credentials && settings.drive.token) {
      this.googleDrive = new GoogleDrive(settings.drive)
    }
  }

  setState(state) {
    const index = state.indexOf('.');

    if (index !== -1) {
      const name = state.substring(0, index),
        value = state.substring(index + 1);

      this.states.on[name] = value;
    } else if (state == 'night') {
      this.setNightMode(true)
    } else if (state == 'day') {
      this.setNightMode(false)
    } else {
      this.states.on._default = state;
    }
    
    const modes = {
      motion: false,
      timelapse: false,
      capture: false
    }

    for(let name of Object.keys(this.states.on)) {
        const newValue = this.states.on[name];
        modes[newValue] = true
    }

    if (modes.motion) {
      this.startMotion();
    }

    if (this.ffmpegStill && modes.timelapse !== this.modes.timelapse) {
      // Begin/end timelapse images for upload
      if (modes.timelapse) {
        this.startTimelapse()
      } else {
        this.stopTimelapse()
      }
    }

    if (modes.capture !== this.modes.capture) {
      // Begin/end capturing video for upload
      if (modes.capture) {
        this.startStream('capture')
      } else {
        this.stopStream('capture', true).catch(ex => {
          console.error('Error closing stream file', ex);
        })
      }
    }

    this.modes = modes

    if (!this.ffmpegStill && state === 'timelapse' && !this.snapshotPromise && !this.modes.capture) {
      this.snapshotPromise = this.pauseForSnapshot().then(() => {
        this.snapshotPromise = null;
      })
    }
  }

  setNightMode(nightMode) {
    if (this.nightMode !== nightMode) {
      this.nightMode = nightMode

      if (this.videoBuffer.isRunning()) {
        this.stopVideo().then(() => {
          this.startVideo()
        })
      }
    }
  }

  startVideo() {
    this.videoBuffer.startVideo(this.cameraSettings());
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

        const options = this.cameraSettings()
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
    this.emit('changed', 'movement')
  }

  startMotion() {
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout)
    } else {
      console.log(`start stream: ${time()}`)
      this.startStream('motion')
    }

    this.motionTimeout = setTimeout(() => {
      console.log(`stop stream: ${time()}`)

      this.motionTimeout = null
      this.stopStream('motion')
    }, this.options.clipMilliseconds - this.options.bufferMilliseconds)
  }

  startStream(targetName) {
    this.streamTargets[targetName] = true

    if (!this.videoBuffer.isStreaming()) {
      this.videoBuffer.startStream()
      this.streamUpload = false
    }
  }

  stopStream(targetName, upload) {
    this.streamTargets[targetName] = false
    if (upload) {
      this.streamUpload = true
    }

    let anyTarget = false
    for(let target of Object.keys(this.streamTargets)) {
      if (this.streamTargets[target]) {
        anyTarget = true
      }
    }

    if (this.videoBuffer.isStreaming() && !anyTarget) {
      return this.videoBuffer.stopStream()
        .then(filePath => {
          if (this.streamUpload) {
            this.uploadToDrive(filePath)
          }
          return filePath
        })
    } else {
      return Promise.resolve()
    }
  }

  uploadToDrive(filePath) {
    if (this.googleDrive) {
      const parts = filePath.split('/')
      const dateFolder = parts[parts.length -2]
      const targetFolder = `${dateFolder}/${this.nodeName}`
      this.googleDrive.uploadFile(filePath, targetFolder)
    }
  }

  startTimelapse() {
    this.videoBuffer.startTimelapse(this.ffmpegStill)
  }

  stopTimelapse() {
    this.videoBuffer.stopTimelapse(this.ffmpegStill)
  }

  onTimelapseImage(image) {
    this.uploader.queueData(image)
  }

  cameraSettings() {
    const settings = {...this.options.settings}

    if (this.nightMode) {
      return {... settings, ...this.options.nightSettings }
    }

    return settings
  }

  _test() {
    this.setState(this.modes.motion ? "off" : "timelapse")
  }
}
module.exports = VideoCamera
