// NON-WORKING CODE
// The canvas library doesn't support the necessary features for the
// h264-live-player to use to decode the video stream to

const { createCanvas } = require('canvas')
const WSAvcPlayer = require('h264-live-player')
const fs = require('fs')
const path = require('path')

if(!global.requestAnimationFrame) 
    global.requestAnimationFrame = setImmediate

class VideoSnapshot {
    constructor(options) {
        this.canvas = createCanvas(options.width, options.height)
        const ctx = this.canvas.getContext("2d");
        ctx.rect(0, 0, options.width, options.height);
        ctx.fillStyle = 'white';
        ctx.fill();

        this.wsavc = new WSAvcPlayer(this.canvas, "2d", 1, 35)
        this.wsavc.initCanvas(options.width, options.height);

        setTimeout(() => {
            const out = fs.createWriteStream(path.join(__dirname, '/../../test.jpeg'))
            const stream = this.canvas.createJPEGStream()
            stream.pipe(out)
            out.on('finish', () =>  console.log('The JPEG file was created.'))
        }, 5000)
    }

    addFrame(data) {
        const frame = new Uint8Array(data);
        this.wsavc.addFrame(frame);
    }

    getSnapshot() {
        return new Promise((resolve, reject) => {
            canvas.toBuffer((err, result) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }
}
module.exports = VideoSnapshot
