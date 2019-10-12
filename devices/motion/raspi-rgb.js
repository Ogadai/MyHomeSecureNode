"use strict"
const EventEmitter = require('events'),
    	extend = require('extend'),
      spawn = require("child_process").spawn,
      INFINITY_MS = 999999999

const COMMAND = {
  yuv: '/opt/vc/bin/raspiyuv',
  still: '/opt/vc/bin/raspistill'
}

class RaspiRGB extends EventEmitter {
  constructor(cameraType = 'yuv') {
    super()

    this.childProcess = null
    this.stop = this.stop.bind(this)
    this.childStopped = this.childStopped.bind(this)
    this.cameraSettings = null
    this.command = COMMAND[cameraType]
    this.yuv = cameraType === 'yuv'
    this.buffer = null
  }

  start(cameraSettings) {
    this.cameraSettings = cameraSettings
    this.startChild()
  }

  startChild() {
    process.on('exit', this.stop);

    const args = this.getArgs(this.cameraSettings)
    this.imageSize = this.cameraSettings.width * this.cameraSettings.height * 4

    console.log(this.command, ...args)
    this.childProcess = spawn(this.command, args)
    this.buffer = null

    this.childProcess.stdout.on('data', data => this.onChunk(data));

    this.childProcess.stderr.on('data', data => {
      console.log(`${this.command}:stderr - ${data}`)
    });

    this.childProcess.on('close', this.childStopped)
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
    // Returns promise
    if (this.childProcess) {
      process.removeListener('exit', this.stop)
      this.childProcess.removeListener('close', this.childStopped)

      return new Promise(resolve => {
        const childProcess = this.childProcess
        this.childProcess = null

        try {
          childProcess.on('close', () => {
            resolve()
          })
          childProcess.kill()
        } catch (err) {
          console.error(`Error closing ${this.command}`)
          console.error(err)

          resolve()
        }
      })
    } else {
      return Promise.resolve()
    }
  }

  childStopped(code) {
    process.removeListener('exit', this.stop)
    this.childProcess.removeListener('close', this.childStopped)
    console.log(`${this.command} closed with code ${code}`)

    setTimeout(() => this.startChild(), 5000)
  }

  getArgs(cameraSettings) {
    const options = extend(
        { width: 256, height: 256, timelapse: 1000 },
        cameraSettings,
        { timeout: INFINITY_MS, output: '-' }
      )
    delete options.quality
    delete options.thumb

    // build the arguments
    var args = [];
    for(var opt in options){
      args.push("--" + opt);
      //don't add value for true flags
      if( options[opt].toString() != "true" && options[opt].toString() != "false"){
        args.push(options[opt].toString());
      }
    }
    return args
  }
}
module.exports = RaspiRGB
