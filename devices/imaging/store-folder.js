"use strict"
const fs = require('fs'),
  path = require('path'),
  rimraf = require('rimraf'),
  extend = require('extend')

const DEFAULT_OPTIONS = {
  store: '.',
  storeDays: 5
}

class StoreFolder {
  constructor(options) {
    this.options = extend({}, DEFAULT_OPTIONS, options)
    
    this.path = path.join(__dirname, '../..', this.options.store),
    this.storeDays = this.options.storeDays

    this.checkedFolders = {}
  }

  checkFolder(folderName) {
    if (!this.checkedFolders[folderName]) {
      return new Promise((resolve, reject) => {
        const folderPath = path.join(this.path, folderName)
        const folders = fs.readdirSync(this.path)

        // Check if the target folder exists
        if (!folders.find(f => f === folderName)) {
          fs.mkdir(folderPath, err => {
            if (err) {
              console.log(`Failed to create store folder ${folderPath}`, err)
              reject(`Failed to create store folder ${folderPath}`)
            } else {
              this.checkedFolders[folderName] = true
              resolve()
            }
          })
          this.purgeFolders(folders)
        } else {
          this.checkedFolders[folderName] = true
          resolve()
        }
      })
    } else {
      return Promise.resolve()
    }
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
  }
}

module.exports = StoreFolder
