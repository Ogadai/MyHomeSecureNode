"use strict"
const extend = require('extend'),
      fs = require('fs'),
      path = require('path'),
      spawn = require("child_process").spawn

const DEFAULT_OPTIONS = {
    tempPath: '.',
    videoPath: '.'
}

const getFilePath = (folder, file) => {
    return path.join(__dirname, '../..', folder, file)
}

class Mp4BoxToFile {
    constructor(options, writeFile) {
        this.options = extend({}, DEFAULT_OPTIONS, options)

        this.writeName = writeFile

        const fileParts = writeFile.split('/')
        const filestamp = fileParts[fileParts.length -1].split('.')[0]
        this.tempPath = getFilePath(this.options.tempPath, `${filestamp}.h264`)
        this.writeStream = fs.createWriteStream(this.tempPath)
    }

    write(data) {
        this.writeStream.write(data)
    }

    close() {
        this.writeStream.close()

        return this.convertToMP4(this.tempPath,
            getFilePath(this.options.videoPath, this.writeName)
        )
    }
    
    convertToMP4(from, to) {
        return new Promise(resolve => {
            const childProcess = spawn('MP4Box', ['-add', from, to])
            childProcess.on('close', () => {
                fs.unlinkSync(from)
                resolve(to)
            })
        })
    }
}

module.exports = Mp4BoxToFile
