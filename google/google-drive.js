"use strict"
const fs = require('fs')
const { google } = require('googleapis')

const UPLOAD_FOLDER = 'HomeSecureStream'

class GoogleDrive {
  constructor({ credentials, token }) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const auth = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);
    auth.setCredentials(token)

    this.drive = google.drive({version: 'v3', auth});
  }

  uploadFile(filePath, targetFolder) {
    console.log(`Uploading ${filePath} to Google Drive at ${targetFolder}`)

    this.uploadFileToPath(`${UPLOAD_FOLDER}/${targetFolder}`, filePath)
      .catch(err => {
        console.error(err)
      })
  }

  async uploadFileToPath(folderPath, filePath) {
    const folders = folderPath.split('/')
    let folderDetail
    for(let folder of folders) {
      folderDetail = await this.getOrCreateFolder(folder, folderDetail && folderDetail.id)
    }
    
    await this.uploadFileToFolder(filePath, folderDetail.id)
  }

  getOrCreateFolder(folderName, parentId) {
    return new Promise((resolve, reject) => {
      let query = `name='${folderName}' and mimeType = 'application/vnd.google-apps.folder'`
      if (parentId) {
        query += ` and '${parentId}' in parents`
      }

      this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      }, (err, res) => {
        if (err) {
          // Handle error
          console.log(`Error searching for folder ${folderName}`)
          reject(err)
        } else {
          const { files } = res.data
          if (files.length > 0) {
            resolve(files[0])
          } else {
            this.createFolder(folderName, parentId)
                .then(resolve).catch(reject)
          }
        }
      })
    })
  }

  createFolder(folderName, parentId) {
    return new Promise((resolve, reject) => {
      const fileMetadata = {
        'name': folderName,
        'mimeType': 'application/vnd.google-apps.folder'
      }
      if (parentId) {
        fileMetadata.parents = [parentId]
      }

      this.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      }, (err, file) => {
        if (err) {
          // Handle error
          console.error(`Failed to create folder ${folderName}`)
          reject(err)
        } else {
          resolve(file.id)
        }
      })
    })
  }

  uploadFileToFolder(filePath, parentId) {
    return new Promise((resolve, reject) => {
      const fileParts = filePath.split('/')
      const fileName = fileParts[fileParts.length -1]

      const fileMetadata = {
        'name': fileName,
        parents: [parentId]
      }

      const media = {
        mimeType: this.getMimeType(fileName),
        body: fs.createReadStream(filePath)
      }

      this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      }, (err, file) => {
        if (err) {
          // Handle error
          console.error(`Failed to upload file ${fileName}`)
          reject(err)
        } else {
          resolve(file.data.id)
        }
      })
    })
  }
  getMimeType(fileName) {
    const nameParts = fileName.split('.')
    const ext = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

    if (ext === 'mp4') {
      return 'video/mp4'
    }
    return 'image/jpeg'
  }
}
module.exports = GoogleDrive
