"use strict"
const   fs = require('fs'),
        path = require('path'),
        jpegEncode = require('./jpeg-encode'),
        StoreFolder = require('../imaging/store-folder')

class MotionStore {
    constructor(config) {
        this.path = path.join(__dirname, '../..', config.store)
        this.queue = []
        this.storeFolder = new StoreFolder(config)
    }

    image(imageData) {
        this.queue.push(imageData)
        this.triggerSave()
    }

    triggerSave() {
        if (this.queue.length > 0) {
            setTimeout(() => this.doSave())
        }
    }

    doSave() {
        if (this.queue.length > 0) {
            const imageData = this.queue.shift()
            jpegEncode(imageData)

            const now = new Date().toISOString().split('T')
            const folderstamp = now[0]
            const filestamp = now[1]
                .replace(/:/g, '-')
                .replace(/\./g, '_')

            this.storeFolder.checkFolder(folderstamp).then(() => {
                const filePath = path.join(this.path, folderstamp, `${filestamp}.jpg`)
                fs.writeFile(filePath, imageData.jpeg, err => {
                    if (err) {
                        console.log(`Failed to save store image ${filePath}`, err)
                    }
                    this.triggerSave()
                })
            })
        }
    }
}

module.exports = MotionStore
