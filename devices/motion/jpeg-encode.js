"use strict"
const   jpeg = require('jpeg-js')

function jpegEncode(imageData) {
    if (!imageData.jpeg) {
        const jpegData = jpeg.encode(imageData, 50)
        imageData.jpeg = jpegData.data
    }
}

module.exports = jpegEncode
