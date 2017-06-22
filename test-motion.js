const Motion = require('./devices/motion/motion')
    , RaspiMotion = require('./devices/motion/raspi-motion')
    , fs = require('fs')

console.log('Running test-motion')

const raspiMotion = new RaspiMotion({
    mock: true,
    settings: {

    },
    timelapseSettings: {

    },
    motionSettings: {
        width: 128,
        height: 128,
        annotate: 0,
        timelapse: 500,
        mode: 7
    }
})

console.log('starting')
raspiMotion.start()
raspiMotion.on('motion', () => {
    console.log('** MOTION DETECTED **')
})
setTimeout(() => {
    console.log('triggering stop')
    raspiMotion.stop().then(() => {
        console.log('stopped')
    })
}, 30000)


// testMotion({
//     includes: [
//         { left: 423, top: 265, width: 751, height: 465 }
//     ]
// }, './devices/test/garage')

// testMotion({
//     includes: [
//         { left: 229, top: 524, width:669, height: 206 }
//     ]
// }, './devices/test/house')

// testMotion({
//     includes: [
//         { left: 0, top: 629, width: 800, height: 100 },
//         { left: 1132, top: 550, width: 164, height: 180 },
//         { left: 0, top: 314, width: 133, height: 279 }
//     ]
// }, './devices/test/front')

function testMotion(config, path) {
    const files = fs.readdirSync(path)
        , motion = new Motion(config)

    const testFile = index => {
        if (index < files.length) {
            const file = files[index]
            motion.check(`${path}/${file}`, response => {
                console.log(`File ${file} - ${response ? '** MOTION DETECTED **' : 'no motion'}`)

                testFile(index + 1)
            })
        }
    }
    testFile(0)
}
