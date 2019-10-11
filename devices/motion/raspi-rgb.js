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
  }

  start(cameraSettings) {
    this.cameraSettings = cameraSettings
    this.startChild()
  }

  startChild() {
    process.on('exit', this.stop);

    const args = this.getArgs(this.cameraSettings)
    this.childProcess = spawn(this.command, args)

    this.childProcess.stdout.on('data', data => {
      const imageData = {
        width: this.cameraSettings.width,
        height: this.cameraSettings.height,
        data
      }
      this.emit('image', imageData)
    });

    this.childProcess.stderr.on('data', data => {
      console.log(`${this.command}:stderr - ${data}`)
    });

    this.childProcess.on('close', this.childStopped)
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

  childStopped() {
    process.removeListener('exit', this.stop)
    this.childProcess.removeListener('close', this.childStopped)
    console.log(`${this.command} closed with code ${code}`)

    setTimeout(() => this.startChild(), 5000)
  }

  getArgs(cameraSettings) {
    const options = extend(
        { width: 256, height: 256 },
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
