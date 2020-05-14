"use strict"
const VideoBuffer = require('./devices/video/video-buffer')

const videoBuffer = new VideoBuffer({
    tempPath: '../garageCam',
    videoPath: '../cam'
})

const time = () => {
    return new Date().toISOString().split('T')[1]
}

console.log(`start: ${time()}`)
videoBuffer.startVideo({
    width: 800, height: 450, nopreview: true, annotate: 12, exposure: 'sports',
    framerate: 25, awb: 'greyworld'
});

let motionTimeout
videoBuffer.on('motion', () => {
    console.log(`motion detected: ${time()}`)
    if (motionTimeout) {
        clearTimeout(motionTimeout)
    } else {
        console.log(`start stream: ${time()}`)
        videoBuffer.startStream()
    }

    motionTimeout = setTimeout(() => {
        motionTimeout = null
        console.log(`stop stream: ${time()}`)
        videoBuffer.stopStream().then(filename => console.log(filename))
    }, 20000)
})

// setTimeout(() => {
//     console.log(`first stream: ${time()}`)
//     videoBuffer.startStream()
// }, 20000)

// setTimeout(() => {
//     videoBuffer.stopStream().then(filename => console.log(filename))
//     console.log(`second stream: ${time()}`)
//     videoBuffer.startStream()
// }, 40000)



// setTimeout(() => {
//     console.log(`stop: ${time()}`)
//     videoBuffer.stopStream().then(filename => console.log(filename))
//     videoBuffer.stopVideo()
// }, 60000)
