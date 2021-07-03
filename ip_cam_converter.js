"use strict"
const extend = require('extend'),
    fs = require('fs'),
    path = require('path'),
    moment = require('moment'),
    FfmpegToFile = require('./devices/video/ffmpeg-to-file'),
    StoreFolder = require('./devices/imaging/store-folder')

const DEFAULT_OPTIONS = {
    videoPath: '.',
    rootPath: '../../ftp/test',
    storeDays: 5,
    videoRegEx: /^\/(?<year>\d\d\d\d)(?<month>\d\d)(?<day>\d\d)\/record\/.\d*_(?<hour>\d\d)(?<minute>\d\d)(?<second>\d\d)_\d*.264/,
    imageRegEx: /^\/(?<year>\d\d\d\d)(?<month>\d\d)(?<day>\d\d)\/images\/.\d\d\d\d\d\d(?<hour>\d\d)(?<minute>\d\d)(?<second>\d\d)\d\d.jpg/,
    folderRegEx: /^\/(?<year>\d\d\d\d)(?<month>\d\d)(?<day>\d\d)/
}

const readdir = promisify(fs.readdir)
const mkdir = promisify(fs.mkdir)
const unlink = promisify(fs.unlink)
const rmdir = promisify(fs.rmdir)

class IPCamConverter {
  constructor(options) {
      this.options = extend({}, DEFAULT_OPTIONS, options)
      this.storeFolder = new StoreFolder({
        store: this.options.videoPath,
        storeDays: this.options.storeDays
      })
    }

  async execute() {
    await this.processVideos();
    await this.processImages();
    await this.removeOldFolders();
  }

  async processVideos() {
    const { rootPath, videoPath, videoRegEx } = this.options;
    const files = await getFiles(rootPath)

    for(let file of files) {
      try {
        const fileDetails = await this.prepareFile(file.path, videoRegEx, 'mp4')

        if (fileDetails) {
          await this.convert264ToMP4(file.path, videoPath, fileDetails.writeName)

          await unlink(file.path)
        }
      } catch(e) {
        console.error(`Error converting file ${file.path}`, e)
      }
    }
  }

  async processImages() {
    const { rootPath, videoPath, imageRegEx } = this.options;
    const files = await getFiles(rootPath)

    for(let file of files) {
      try {
        const fileDetails = await this.prepareFile(file.path, imageRegEx, 'jpg')

        if (fileDetails) {
          await this.copyFile(file.path, videoPath, fileDetails.writeName)
          
          await unlink(file.path)
        }
      } catch(e) {
        console.error(`Error copying file ${file.path}`, e)
      }
    }
  }

  async removeOldFolders() {
    const { rootPath, videoPath, folderRegEx } = this.options;
    const folders = (await readdir(rootPath, { withFileTypes: true }))
          .filter(folder => folder.isDirectory());

    const now = moment()
    const todayFolder = now.format('YYYY-MM-DD')
  
    for(let folder of folders) {
      try {
        const folderPath = path.join(rootPath, folder.name)
        const match = folderRegEx.exec(folderPath.substring(rootPath.length))

        if (match) {
          const data = match.groups;
          const datedName = `${data.year}-${data.month}-${data.day}`

          if (todayFolder !== datedName) {
            await rmdir(path.join(rootPath, folder.name), { recursive: true })
          }
        }
      } catch(e) {
        console.error(`Error removing old folder ${folder.name}`, e)
      }
    }
  }

  async prepareFile(filePath, regEx, extension) {
    const { rootPath, videoPath } = this.options;
    const match = regEx.exec(filePath.substring(rootPath.length))

    if (match) {
      const data = match.groups;
  
      const folderName = `${data.year}-${data.month}-${data.day}`
      const fileName = `${data.hour}-${data.minute}-${data.second}`
  
      const writeName = `${folderName}/${fileName}.${extension}`
  
      await this.storeFolder.checkFolder(folderName)
  
      if (await access(filePath, fs.constants.W_OK)) {
        const targetFile = path.join(videoPath, writeName);
        if (await access(targetFile, fs.constants.F_OK)) {
          // Remove existing file
          await unlink(targetFile)
        }

        return {
          writeName
        }
      }
    }

    return null
  }
    
  convert264ToMP4(readFile, videoPath, writeFile) {
    const fileSettings = {
      videoPath,
      framerate: 20,
      ffmpeg: [
        '-vsync', 'cfr'
      ]
    };

    return new Promise((resolve, reject) => {
      try {
        const streamToFile = new FfmpegToFile(fileSettings, writeFile)

        const readStream = fs.createReadStream(readFile)
        
        readStream.on('error', err => {
          console.error(`Error reading source video ${readFile}`, err)
          reject(err)
        });
        
        readStream.on('data', data => {
          streamToFile.write(data)
        })
        
        readStream.on('close', data => {
          streamToFile.close()
          resolve();
        })
      } catch(e) {
        console.error(`Exception converting source video ${readFile}`, e)
        reject(e);
      }
    })
  }

  copyFile(readFile, videoPath, writeFile) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(readFile);
      const writeStream = fs.createWriteStream(path.join(videoPath, writeFile));

      readStream.on('error', reject);
      writeStream.on('error', reject);
      readStream.on('close', () => resolve());

      readStream.pipe(writeStream);
    })
  }
}

async function getFiles(folderPath = "./") {
  const entries = await readdir(folderPath, { withFileTypes: true });

  // Get files within the current directory and add a path key to the file objects
  const files = entries
      .filter(file => !file.isDirectory())
      .map(file => ({ ...file, path: path.join(folderPath, file.name) }));

  // Get folders within the current directory
  const folders = entries.filter(folder => folder.isDirectory());

  for (const folder of folders) {
      files.push(...await getFiles(path.join(folderPath, folder.name)));
  }

  return files;
}

function access(path, options) {
  return new Promise(resolve => {
    fs.access(path, options, (err) => {
      resolve(!err)
    })
  })
}

function promisify(fn) {
  return (...params) => {
    return new Promise((resolve, reject) => {
      fn(...params, (err, files) => {
        if (err) {
          reject(err)
        } else {
          resolve(files)
        }
      })
    })
  }
}

module.exports = IPCamConverter
