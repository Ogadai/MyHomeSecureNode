"use strict"
const EventEmitter = require('events'),
      extend = require('extend'),
      fs = require('fs'),
      path = require('path'),
      spawn = require("child_process").spawn,
      moment = require('moment'),
      VideoFeed = require('./video-feed'),
      StoreFolder = require('../imaging/store-folder')

const SETUP_FRAME_COUNT = 3
const DEFAULT_OPTIONS = {
    debug: false,
    tempPath: '.',
    videoPath: '.',
    bufferMilliseconds: 10000,
    movementThreshold: 2.3
}

const fileName = (folder, file) => {
    return path.join(__dirname, '../..', folder, file)
}

class VideoBuffer extends EventEmitter {
    constructor(options) {
        super()
        this.options = extend({}, DEFAULT_OPTIONS, options)
        this.storeFolder = new StoreFolder(options)
        
        this.videoFeed = null
        this.setupFrames = []
        this.bufferFrames = []

        this.tempName = null
        this.writeName = null
        this.writeStream = null
    }

    startVideo(cameraSettings) {
        this.stopVideo()

        this.videoFeed = new VideoFeed()
        this.videoFeed.on('frame', data => this.onFrame(data))
        this.videoFeed.start(cameraSettings)

        this.lastMotionTime = Date.now()
    }

    stopVideo() {
        if (this.videoFeed) {
            const feed = this.videoFeed
            this.videoFeed = null
            return feed.stop()
        }
        return Promise.resolve()
    }
    
    startStream() {
        this.stopStream()

        const now = moment()
        const folderstamp = now.format('YYYY-MM-DD')
        const filestamp = now.format('HH-mm-ss')

        this.storeFolder.checkFolder(folderstamp).then(() => {
            this.tempName = `${filestamp}.h264`;
            this.writeName = `${folderstamp}/${filestamp}.mp4`;
            this.writeStream = fs.createWriteStream(fileName(this.options.tempPath, this.tempName))

            this.setupFrames.forEach(data => {
                this.writeStream.write(data)
            })

            this.bufferFrames.forEach(({data}) => {
                this.writeStream.write(data)
            })
        })
    }

    stopStream() {
        if (this.writeStream) {
            this.writeStream.close()
            this.writeStream = null

            return this.convertToMP4(
                fileName(this.options.tempPath, this.tempName),
                fileName(this.options.videoPath, this.writeName)
            )
        } else {
            return Promise.resolve()
        }

    }

    onFrame(data) {
        if (this.setupFrames.length < SETUP_FRAME_COUNT) {
            this.setupFrames.push(data)
        }

        const timestamp = Date.now()
        let startIndex = 0
        while(startIndex < this.bufferFrames.length
                && this.bufferFrames[startIndex].timestamp < timestamp - this.options.bufferMilliseconds) {
            startIndex++;
        }

        const oldFrames = (startIndex > 0) ? this.bufferFrames.slice(startIndex) : this.bufferFrames

        this.bufferFrames = oldFrames.concat([{
            timestamp,
            data,
            size: data.length
        }])

        if (this.writeStream) {
            this.writeStream.write(data)
        }

        this.checkFramesForMotion()
    }

    checkFramesForMotion() {
        let previousCount = 0;
        let previousSum = 0;
        let lastCount = 0;
        let lastSum = 0;

        const timeNow = Date.now()

        this.bufferFrames.forEach(({timestamp, size}) => {
            if (timestamp < timeNow - 1000) {
                previousCount++
                previousSum += size
            } else {
                lastCount++
                lastSum += size
            }
        })

        const previousAvg = previousCount > 0 ? previousSum / previousCount : 0
        const lastAvg = lastCount > 0 ? lastSum / lastCount : 0

        if (this.options.debug) {
            if (!this.lastDebugTime || (timeNow > this.lastDebugTime + 1000)) {
                console.log(`previousAvg: ${Math.floor(previousAvg)}, lastAvg: ${Math.floor(lastAvg)}`)
                this.lastDebugTime = timeNow
            }
        }

        if ((previousCount > lastCount) && (timeNow > this.lastMotionTime + 5000)
                && (lastAvg > previousAvg * this.options.movementThreshold)) {
            this.emit('motion')
            this.lastMotionTime = timeNow
        }
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
module.exports = VideoBuffer

