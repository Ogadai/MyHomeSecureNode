"use strict"
const extend = require('extend'),
      path = require('path'),
      spawn = require("child_process").spawn

const DEFAULT_OPTIONS = {
    videoPath: '.'
}

const getFilePath = (folder, file) => {
    return path.join(__dirname, '../..', folder, file)
}

class FfmpegToFile {
    constructor(options, writeFile) {
        this.options = extend({}, DEFAULT_OPTIONS, options)

        this.filePath = getFilePath(this.options.videoPath, writeFile)

        this.childProcess = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-vcodec', 'copy',
            this.filePath
          ])

        const processExit = () => {
            process.removeListener('exit', processExit)
            this.childProcess.kill()
        }
        process.on('exit', processExit)
    }

    write(data) {
        this.childProcess.stdin.write(data)
    }

    close() {
        return new Promise(resolve => {
            this.childProcess.on('close', () => resolve(this.filePath))
            this.childProcess.stdin.end()
        })
    }
}

module.exports = FfmpegToFile
