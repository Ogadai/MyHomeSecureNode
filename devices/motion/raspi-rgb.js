"use strict"
const EventEmitter = require('events'),
    	extend = require('extend'),
      spawn = require("child_process").spawn,
      COMMAND = 'raspistillyuv',
      INFINITY_MS = 999999999

class RaspiRGB extends EventEmitter {
  constructor() {
    super()

    this.childProcess = null
    this.stop = this.stop.bind(this)
  }

  start(cameraSettings) {
    process.on('exit', this.stop);

    const args = this.getArgs(cameraSettings)
    this.childProcess = spawn(COMMAND, args)

    this.childProcess.stdout.on('data', data => {
      const imageData = {
        width: cameraSettings.width,
        height: cameraSettings.height,
        data
      }
      this.emit('image', imageData)
    });

    this.childProcess.stderr.on('data', data => {
      console.log(`${COMMAND}:stderr - ${data}`);
    });

    this.childProcess.on('close', code => {    
      console.log(`${COMMAND} closed with code ${code}`)
    });
  }

  stop() {
    // Returns promise
    if (this.childProcess) {
      process.removeListener('exit', this.stop);

      return new Promise(resolve => {
        const childProcess = this.childProcess
        this.childProcess = null

        try {
          childProcess.on('close', () => {
            resolve()
          })
          childProcess.kill()
        } catch (err) {
          console.error(`Error closing ${COMMAND}`)
          console.error(err)

          resolve()
        }
      })
    } else {
      return Promise.resolve()
    }
  }

  getArgs(cameraSettings) {
    const options = extend(
        { width: 256, height: 256 },
        cameraSettings,
        { mode: 'timelapse', timeout: INFINITY_MS, output: '-' }
      )

    // build the arguments
    var args = [];
    for(var opt in options){
      args.push("--" + opt);
      //don't add value for true flags
      if( this.opts[opt].toString() != "true" && this.opts[opt].toString() != "false"){
        args.push(this.opts[opt].toString());
      }
    }
    return args
  }
}
module.exports = RaspiRGB
