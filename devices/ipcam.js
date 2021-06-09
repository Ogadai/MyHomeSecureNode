"use strict"
const EventEmitter = require('events'),
  extend = require('extend'),
  Cam = require('onvif').Cam,
  Stream = require('node-rtsp-stream')

const DEFAULT_OPTIONS = {
  host: '',
  user: 'admin',
  password: '',
  port: 8080,
  streamReplace: []
}

class IPCamera extends EventEmitter {
  constructor(config, nodeName) {
    super()
    this.options = extend({}, DEFAULT_OPTIONS, config)
    this.nodeName = nodeName
    this.stream = null;
    this.type = 'jsmp'
  }

  async initialise(streamPort) {
    const url = await this.getStreamUrl()
    console.log(url)

    this.stream = new Stream({
      name: this.nodeName,
      streamUrl: url.replace('rtsp://', `rtsp://${this.options.user}:${this.options.password}@`),
      wsPort: streamPort,
      ffmpegOptions: {
        '-r': 25,
        '-maxrate': 2048000,
        '-bufsize': 2048000
      }
    })
  }
  
  getStreamUrl() {
    return new Promise((resolve, reject) => {
      const cam = new Cam({
        hostname: this.options.host,
        username: this.options.user,
        password: this.options.password,
        port: this.options.port
      }, (err) => {
        if (err) {
          reject(err)
        } else {
          cam.getStreamUri({protocol:'RTSP'}, (err, rtsp) => {
            if (err) {
              reject(err)
            } else {
              if (this.options.streamReplace && this.options.streamReplace.length >= 2) {
                resolve(rtsp.uri.replace(this.options.streamReplace[0], this.options.streamReplace[1]))
              } else {
                resolve(rtsp.uri)
              }
            }
          })
        }
      })
    })
  }
}
module.exports = IPCamera
