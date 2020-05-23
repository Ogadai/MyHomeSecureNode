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

        this.processExit = this.processExit.bind(this)
        process.on('exit', this.processExit)
    }

    write(data) {
        this.childProcess.stdin.write(data)
    }

    close() {
        return new Promise(resolve => {
            const onClosed = () => {
                this.childProcess.removeListener('close', onClosed)
                resolve(this.filePath)
            }
            
            process.removeListener('exit', this.processExit)

            this.childProcess.on('close', onClosed)
            this.childProcess.stdin.end()
        })
    }

    processExit() {
        process.removeListener('exit', this.processExit)
        this.childProcess.kill()
    }
}

module.exports = FfmpegToFile
