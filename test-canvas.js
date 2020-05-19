const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')

const canvas = createCanvas(200, 200)
const ctx = canvas.getContext('2d')

// Write "Awesome!"
ctx.font = '30px Impact'
ctx.fillStyle = 'rgba(0,255,0,0.5)'
ctx.rotate(0.1)
ctx.fillText('Awesome!', 50, 100)

// Draw line under text
var text = ctx.measureText('Awesome!')
ctx.strokeStyle = 'rgba(255,0,0,0.5)'
ctx.beginPath()
ctx.lineTo(50, 102)
ctx.lineTo(50 + text.width, 102)
ctx.stroke()

const out = fs.createWriteStream(__dirname + '/test.jpeg')
const stream = canvas.createJPEGStream()
stream.pipe(out)
out.on('finish', () =>  console.log('The JPEG file was created.'))
