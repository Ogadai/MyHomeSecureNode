"use strict"
const extend = require('extend'),
      IPCamConverter = require('./ip_cam_converter')

const DEFAULT_OPTIONS = {
  seconds: 60,
  cams: []
}
    
class IPCamList {
  constructor(options) {
    this.options = extend({}, DEFAULT_OPTIONS, options)

    if (this.options.cams && this.options.cams.length > 0) {
      setInterval(() => this.execute(), this.options.seconds * 1000)
    }
  }

  async execute() {
    for(let cam of this.options.cams) {
      const converter = new IPCamConverter(cam);

      try {
        await converter.execute();
      } catch (e) {
        console.error(`Exception processing ipcam ${cam.name}`)
      }
    }
  }
}
module.exports = IPCamList
