"use strict"
const EventEmitter = require('events'),
  extend = require('extend'),
  spawn = require("child_process").spawn

const COMMAND = {
  yuv: '/opt/vc/bin/raspiyuv',
  still: '/opt/vc/bin/raspistill',
  video: '/opt/vc/bin/raspivid'
}

class CameraProcess extends EventEmitter {
  constructor(type) {
    super()

    this.childProcess = null
    this.stop = this.stop.bind(this)
    this.childStopped = this.childStopped.bind(this)
    this.command = COMMAND[type]
  }

  start(cameraSettings) {
    process.on('exit', this.stop)

    const args = this.getArgs(cameraSettings)

    console.log(this.command, ...args)
    this.childProcess = spawn(this.command, args)

    this.childProcess.stderr.on('data', data => {
      const messages = data.toString()
        .split('\n')
        .map(m => m.trim())
        .filter(m => m.length > 0)

      messages.forEach(message => {
        if (!message.startsWith('mmal: Frame ') && !message.startsWith('mmal: Skipping ')) {
          console.error(`${this.command}:stderr - ${message}`)
        }
      })
    });

    this.childProcess.once('close', this.childStopped)
    return this.childProcess.stdout
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
          childProcess.once('close', () => {
            console.log(`${this.command} stopped`)
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
    this.childProcess = null;
    console.log(`${this.command} closed with code ${code}`)

    this.emit('stopped');
  }

  getArgs(cameraSettings) {
    const options = extend(cameraSettings, { output: '-' })

    // build the arguments
    var args = [];
    for (var opt in options) {
      args.push("--" + opt);
      //don't add value for true flags
      if (options[opt].toString() != "true" && options[opt].toString() != "false") {
        args.push(options[opt].toString());
      }
    }
    return args
  }
}
module.exports = CameraProcess
