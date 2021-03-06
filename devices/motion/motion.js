"use strict"

const jpeg = require('jpeg-js'),
      fs = require('fs'),
      MotionStore = require('./motion-store')

class Motion {
  constructor(config) {
    this.config = Object.assign({
      colourThreshold: 15,
      minPercent: 5,
      maxPercent: 40,
      sequence: 2,
      sample: 4
    }, config)

    this.lastImage = null
    this.currentSequence = 0
    this.motionStore = (config.store && config.store.length) ? new MotionStore(config) : null
  }

  check(file, cb) {
    const initialTime = new Date()
    
    this.readFile(file, imageData => {
      const decodeTime = new Date()

      const result = this.checkRGB(imageData)

      const afterTime = new Date()

      console.log(`${file} - decode:${decodeTime - initialTime}ms, compare:${afterTime - decodeTime}`)
      cb(result)
    })
  }

  checkJpeg(imageData) {
    const rawData = jpeg.decode(imageData.data, true)
    rawData.jpeg = jpeg.data
    return this.checkRGB(rawData)
  }

  // imageData: { width, height, data }
  checkRGB(imageData) {
      const lastImage = this.lastImage
      this.lastImage = imageData
      
      const isMotion = this.compare(lastImage, imageData)

      if (isMotion) {
        if (this.motionStore) {
          this.motionStore.image(imageData)
        }
        this.currentSequence = this.currentSequence + 1
      } else {
        this.currentSequence = 0
      }

      if (this.currentSequence >= this.config.sequence) {
        this.currentSequence = 0
        return true
      }
      return false
  }

  readFile(file, cb) {
    setTimeout(() => {
      const jpegData = fs.readFileSync(file)
      cb(jpeg.decode(jpegData, true))
    }, 1)
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

    for(var y = 0; y < file1.height; y += this.config.sample) {
      for(var x = 0; x < file1.width; x += this.config.sample) {
        const point = { x, y }
        if (this.isIncluded(regions, point)) {
          tally.countedPixels++
          if (this.isChanged(point, file1, file2)) {
            tally.changedPixels++
          }
        }
      }
    }

    const percentChange = Math.round(tally.changedPixels * 100 / tally.countedPixels)
    if (this.config.debug) {
      console.log(`percent: ${percentChange}`)
    }
    return percentChange >= this.config.minPercent
        && percentChange <= this.config.maxPercent
  }

  getRegions(imageData) {
    const processFn = this.processRegion.bind(this, imageData)

    const includes = this.config.includes ? this.config.includes.map(processFn) : [this.defaultInclude(imageData)],
          excludes = this.config.excludes ? this.config.excludes.map(processFn) : []

    return { includes, excludes }
  }

  defaultInclude(imageData) {
    return {
      left: 0,
      top: 0,
      width: imageData.width,
      height: imageData.height
    }
  }

  processRegion(imageData, region) {
    const valFn = (v, size) => {
      if (typeof v === 'string') {
        const numVal = parseInt(v)
        if (v.endsWith('%')) {
          return Math.round(numVal * size / 100)
        }
        return numVal
      }
      return v
    }

    return {
      left: valFn(region.left, imageData.width),
      top: valFn(region.top, imageData.height),
      width: valFn(region.width, imageData.width),
      height: valFn(region.height, imageData.height)
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
