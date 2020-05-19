"use strict"
const VideoBuffer = require('./devices/video/video-buffer')
const FfmpegStill = require('./devices/imaging/ffmpeg-still')

const videoBuffer = new VideoBuffer({
    tempPath: '../garageCam',
    videoPath: '../cam',
    debug: false
})

const time = () => {
    return new Date().toISOString().split('T')[1]
}

console.log(`start: ${time()}`)
videoBuffer.startVideo({
    width: 1280, height: 720, nopreview: true, annotate: 12, exposure: 'sports',
    framerate: 25, awb: 'greyworld', flush: true, intra: 25
});

// let motionTimeout
// videoBuffer.on('motion', () => {
//     console.log(`motion detected: ${time()}`)
//     if (motionTimeout) {
//         clearTimeout(motionTimeout)
//     } else {
//         console.log(`start stream: ${time()}`)
//         videoBuffer.startStream()
//     }

//     motionTimeout = setTimeout(() => {
//         motionTimeout = null
//         console.log(`stop stream: ${time()}`)
//         videoBuffer.stopStream().then(filename => console.log(filename))
//     }, 20000)
// })

const ffmpegStill = new FfmpegStill()
setTimeout(() => {
    videoBuffer.startTimelapse(ffmpegStill)
}, 5300)
setTimeout(() => {
    videoBuffer.stopTimelapse(ffmpegStill)
}, 10900)

// setTimeout(() => {
//     console.log(`first stream: ${time()}`)
//     videoBuffer.startStream()
// }, 15300)

// setTimeout(() => {
//     videoBuffer.stopStream().then(filename => console.log(filename))
//     console.log(`second stream: ${time()}`)
//     videoBuffer.startStream()
// }, 20000)


setTimeout(() => {
    // console.log(`stop: ${time()}`)
    // videoBuffer.stopStream().then(filename => console.log(filename))
    videoBuffer.stopVideo()
}, 15000)
