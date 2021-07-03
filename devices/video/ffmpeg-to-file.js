"use strict"
const extend = require('extend'),
      path = require('path'),
      spawn = require("child_process").spawn

const DEFAULT_OPTIONS = {
    videoPath: '.',
    framerate: undefined,
    ffmpeg: []
}

const getFilePath = (folder, file) => {
    return path.join(__dirname, '../..', folder, file)
}

class FfmpegToFile {
    constructor(options, writeFile) {
        this.options = extend({}, DEFAULT_OPTIONS, options)

        this.filePath = getFilePath(this.options.videoPath, writeFile)

        const framerateParams = this.options.framerate
            ? ['-r', this.options.framerate] : [];

        const params = [
            ...framerateParams,
            '-i', 'pipe:0',
            '-vcodec', 'copy',
            ...this.options.ffmpeg,
            this.filePath
        ]

        this.childProcess = spawn('ffmpeg', params)

        this.processExit = this.processExit.bind(this)
        process.on('exit', this.processExit)

        this.childProcess.stderr.on('data', data => {
            if (!Buffer.isBuffer(data)) {
                console.error(data);
            }
        })
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
        this.childProcess.stdin.end()
        this.childProcess.kill()
    }
}

module.exports = FfmpegToFile
