"use strict"

const jpeg = require('jpeg-js'),
      fs = require('fs')

class Motion {
  constructor(config) {
    this.config = Object.assign({
      colourThreshold: 25,
      minPercent: 10,
      maxPercent: 50
    }, config)
    this.lastImage = null
  }

  check(file) {
    const lastImage = this.lastImage,
          imageData = this.readFile(file)
    if (!imageData) return false;

    this.lastImage = imageData
    return this.compare(lastImage, imageData)
  }

  readFile(file) {
    try {
      const jpegData = fs.readFileSync(file)
      return jpeg.decode(jpegData, true)
    } catch(e) {
      console.log(e)
      return null
    }
  }

  compare(file1, file2) {
    if (!file1 || !file2
      || file1.width !== file2.width
      || file1.height !== file2.height) {
      return false
    }

    const regions = this.getRegions(file1)
        , tally = {
          countedPixels: 0,
          changedPixels: 0
        }

    for(var y = 0; y < file1.height; y++) {
      for(var x = 0; x < file1.width; x++) {
        const point = { x, y }
        if (this.isIncluded(regions, point)) {
          tally.countedPixels++
          if (this.isChanged(point, file1, file2)) {
            tally.changedPixels++
          }
        }
      }
    }

    const percentChange = tally.changedPixels * 100 / tally.countedPixels
    console.log(`percent: ${percentChange}`)
    return percentChange >= this.config.minPercent
        && percentChange <= this.config.maxPercent
  }

  getRegions(imageData) {
    return {
      includes: this.config.includes || [this.defaultInclude(imageData)],
      excludes: this.config.excludes || []
    }
  }

  defaultInclude(imageData) {
    return {
      left: 0,
      top: 0,
      width: imageData.width,
      height: imageData.height
    }
  }

  isIncluded(regions, point) {
    return this.inAnyRect(regions.includes, point)
      &&  !this.inAnyRect(regions.excludes, point)
  }

  inAnyRect(rects, point) {
    for(var n = 0; n < rects.length; n++) {
      if (this.inRect(rects[n], point)) return true
    }
    return false
  }

  inRect(rect, point) {
    return point.x >= rect.left
        && point.x < rect.left + rect.width
        && point.y >= rect.top
        && point.y < rect.top + rect.height
  }

  isChanged(point, file1, file2) {
    const rgb1 = this.getRgb(file1, point),
          rgb2 = this.getRgb(file2, point)

    if (rgb1 && rgb2) {
      return this.isColourChanged(rgb1.r, rgb2.r)
          || this.isColourChanged(rgb1.g, rgb2.g)
          || this.isColourChanged(rgb1.b, rgb2.b)
    }

    return false
  }

  isColourChanged(colour1, colour2) {
    return Math.abs(colour1 - colour2) > this.config.colourThreshold
  }

  getRgb(file, point) {
    const pos = (file.width * point.y + point.x) * 4
    if (pos <= file.data.length - 4) {
      return {
        r: file.data[pos],
        g: file.data[pos + 1],
        b: file.data[pos + 2]
      }
    }

    return null
  }
}

module.exports = Motion
