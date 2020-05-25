"use strict"
const EventEmitter = require('events'),
      extend = require('extend'),
      moment = require('moment'),
      VideoFeed = require('./video-feed'),
      StoreFolder = require('../imaging/store-folder'),
      Mp4BoxToFile = require('./mp4box-to-file'),
      FfmpegToFile = require('./ffmpeg-to-file')

const DEFAULT_OPTIONS = {
    debug: false,
    useFfmpeg: false,
    videoPath: '.',
    bufferMilliseconds: 10000,
    minimumRate: 500,
    maximumRate: 100000,
    movementThreshold: 2.3
}

const SETUP_FRAME_COUNT = 2
const CODED_SLICE_IDR_PICTURE = 5
const SEQUENCE_PARAMETER_SET = 7
const PICTURE_PARAMETER_SET = 8

const FRAME_INIT_TYPES = [CODED_SLICE_IDR_PICTURE, PICTURE_PARAMETER_SET]

class VideoBuffer extends EventEmitter {
    constructor(options) {
        super()
        this.options = extend({}, DEFAULT_OPTIONS, options)
        this.storeFolder = new StoreFolder({
            store: this.options.videoPath,
            storeDays: this.options.storeDays
        })
        
        this.videoFeed = null
        this.setupFrames = []
        this.bufferFrames = []

        this.streamToFile = null

        this.timelapseTargets = []
    }

    isRunning() {
        return !!this.videoFeed;
    }

    isStreaming() {
        return !!this.streamToFile;
    }

    startVideo(cameraSettings) {
        this.stopVideo()

        this.cameraSettings = cameraSettings
        this.videoFeed = new VideoFeed()
        this.videoFeed.on('frame', data => this.onFrame(data))
        this.videoFeed.start(cameraSettings)

        this.lastMotionTime = Date.now()

        this.setupFrames = []
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

        const fileSettings = {
            tempPath: this.options.tempPath,
            videoPath: this.options.videoPath,
            framerate: this.cameraSettings.framerate
        }

        this.storeFolder.checkFolder(folderstamp).then(() => {
            const writeName = `${folderstamp}/${filestamp}.mp4`
            
            this.streamToFile = this.options.useFfmpeg
                    ? new FfmpegToFile(fileSettings, writeName)
                    : new Mp4BoxToFile(fileSettings, writeName)

            this.setupFrames.forEach(data => {
                this.streamToFile.write(data)
            })

            let foundFirstSlice = false
            this.bufferFrames.forEach(({data}) => {
                if (!foundFirstSlice) {
                    const nalu = this.getNALU(data)
                    if (FRAME_INIT_TYPES.includes(nalu.unit_type)) {
                        foundFirstSlice = true
                    }
                }

                if (foundFirstSlice) {
                    this.streamToFile.write(data)
                }
            })
        })
    }

    stopStream() {
        if (this.streamToFile) {
            const response = this.streamToFile.close();
            this.streamToFile = null
            return response
        } else {
            return Promise.resolve()
        }
    }

    onFrame(data) {
        const nalu = this.getNALU(data)
        // if (nalu.unit_type !== 1) {
        //     console.log(`Ref ${nalu.ref_idc}, Type ${nalu.unit_type} (size ${data.length})`)
        // }

        if (this.setupFrames.length < SETUP_FRAME_COUNT) {
            this.setupFrames.push(data)
        } else if (nalu.unit_type === CODED_SLICE_IDR_PICTURE) {
            this.timelapseFrame(data)
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
            type: nalu.unit_type,
            size: data.length
        }])

        if (this.streamToFile) {
            this.streamToFile.write(data)
        }

        this.checkFramesForMotion()
    }

    getNALU(data) {
        if (data.length > 4) {
            const nalu = data[4]
            return {
                ref_idc: (nalu & 98) >> 5,
                unit_type: (nalu & 31)
            }
        }
        return {}
    }

    checkFramesForMotion() {
        let previousCount = 0;
        let previousSum = 0;
        let lastCount = 0;
        let lastSum = 0;

        const timeNow = Date.now()

        this.bufferFrames.forEach(({timestamp, size, type}) => {
            if (type !== CODED_SLICE_IDR_PICTURE) {
                if (timestamp < timeNow - 1000) {
                    previousCount++
                    previousSum += size
                } else {
                    lastCount++
                    lastSum += size
                }
            }
        })

        const previousAvg = Math.min(this.options.maximumRate,
            previousCount > 0 ? previousSum / previousCount : 0)
        const lastAvg = lastCount > 0 ? lastSum / lastCount : 0

        if (this.options.debug) {
            if (!this.lastDebugTime || (timeNow > this.lastDebugTime + 1000)) {
                console.log(`previousAvg: ${Math.floor(previousAvg)}, lastAvg: ${Math.floor(lastAvg)}`)
                this.lastDebugTime = timeNow
            }
        }

        if ((previousCount > lastCount) && (timeNow > this.lastMotionTime + 10000)
                && (lastAvg > previousAvg * this.options.movementThreshold)
                && (lastAvg > this.options.minimumRate)) {
            console.log(`motion detected - previousAvg: ${previousAvg}, lastAvg: ${lastAvg}`)
            this.emit('motion')
            this.lastMotionTime = timeNow
        }
    }

    startTimelapse(target) {
        this.timelapseTargets.push(target)

        if (this.setupFrames.length >= SETUP_FRAME_COUNT) {
            let index = this.bufferFrames.length - 1
            while(index >= 0 && this.bufferFrames[index].type !== CODED_SLICE_IDR_PICTURE) {
                index--
            }
            if (index >= 0) {
                const frames = this.setupFrames.concat(this.bufferFrames[index].data)
                target.create(frames)
            }
            
        }
    }
    
    stopTimelapse(target) {
        this.timelapseTargets = this.timelapseTargets.filter(
            t => t != target
        )
    }

    timelapseFrame(data) {
        if (this.timelapseTargets.length === 0) return

        const frames = this.setupFrames.concat([data])
        for(let target of this.timelapseTargets) {
            target.create(frames)
        }
    }
}
module.exports = VideoBuffer

