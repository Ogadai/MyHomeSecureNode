"use strict"
const EventEmitter = require('events'),
  spawn = require("child_process").spawn

class FfmpegStill extends EventEmitter {
  create(frames) {
    let buffer = null

    const processExit = () => {
      process.removeListener('exit', processExit)
      childProcess.removeListener('close', childClosed)
      childProcess.kill()
    }
    const childClosed = () => {
      process.removeListener('exit', processExit)

      if (buffer) {
        this.emit('image', buffer)
      }
    }
    const onChunk = (data) => {
      if (!buffer) {
        buffer = Buffer.from(data)
      } else {
        buffer = Buffer.concat([buffer, Buffer.from(data)])
      }
    }

    const childProcess = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-vframes', '1',
      '-q:v', '2',
      '-f', 'mjpeg',
      'pipe:1'
    ])

    process.on('exit', processExit)
    childProcess.on('close', childClosed)
    childProcess.stdout.on('data', data => onChunk(data))

    for (let frame of frames) {
      childProcess.stdin.write(frame)
    }
    childProcess.stdin.end()
  }
}
module.exports = FfmpegStill
