"use strict"
const   fs = require('fs'),
        path = require('path'),
        jpeg = require('jpeg-js'),
        rimraf = require('rimraf')

class MotionStore {
    constructor(config) {
        this.path = config.store
        this.storeDays = config.storeDays ? parseInt(config.storeDays) : 0
        this.queue = []
        this.checkedFolders = {}
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
            const encodedJpeg = jpeg.encode(imageData, 50)

            const now = new Date().toISOString().split('T')
            const folderstamp = now[0]
            const filestamp = now[1]
                .replace(/:/g, '-')
                .replace(/\./g, '_')

            this.checkFolder(folderstamp, () => {
                const filePath = path.join(this.path, folderstamp, `${filestamp}.jpg`)
                fs.writeFile(filePath, encodedJpeg.data, err => {
                    if (err) {
                        console.log(`Failed to save store image ${filePath}`, err)
                    }
                    this.triggerSave()
                })
            })
        }
    }

    checkFolder(folderName, cb) {
        if (!this.checkedFolders[folderName]) {
            const folderPath = path.join(this.path, folderName)
            const folders = fs.readdirSync(this.path)

            // Check if the target folder exists
            if (!folders.find(f => f === folderName)) {
                fs.mkdir(folderPath, err => {
                    if (err) {
                        console.log(`Failed to create store folder ${folderPath}`, err)
                    } else {
                        this.checkedFolders[folderName] = true
                        cb()
                    }
                })
                this.purgeFolders(folders)
            } else {
                this.checkedFolders[folderName] = true
            }
        }
        cb()
    }

    purgeFolders(folders) {
        // Remove any older than the age
        if (this.storeDays) {
            const today = new Date()
            folders.forEach(folder => {
                const split = folder.split('-')
                const folderDate = new Date(split[0], split[1] - 1, split[2])
                folderDate.setDate(folderDate.getDate() + this.storeDays + 1)

                if (folderDate < today) {
                    this.removeFolder(folder)
                }
            });
        }
    }

    removeFolder(folderName) {
        console.log(`Removing ${folderName}`)
        const folderPath = path.join(this.path, folderName)
        rimraf(folderPath, err => {
            if (err) {
                console.log(`Failed to remove store image files in folder ${folderPath}`, err)
            }
        })
        // fs.unlink(path.join(folderPath, '*'), err => {
        //     if (err) {
        //         console.log(`Failed to remove store image files in folder ${folderPath}`, err)
        //     } else {
        //         fs.rmdir(folderPath, err => {
        //             console.log(`Failed to remove store image folder ${folderPath}`, err)
        //         })
        //     }
        // })
        
    }
}

module.exports = MotionStore
