"use strict"
const 
	http = require('http'),
	https = require('https')

class Uploader {
    constructor(settings) {
        this.settings = settings
        this.queue = []
    }

    queueData(imageData) {
        this.queue.push(imageData)
        this.triggerUpload()
    }

    
    triggerUpload() {
        if (this.queue.length > 0) {
            setTimeout(() => this.doUpload())
        }
    }

    doUpload() {
        if (this.queue.length > 0) {
            const imageData = this.queue.shift()

            this.uploadData(imageData).then(() => {
                this.triggerUpload()
            })
        }
    }

	beginUpload(timelapseMode = true) {
        const controller = timelapseMode ? 'UploadSnapshot' : 'UploadStream',
            fullUrl = this.settings.addr.replace('wss://', '').replace('ws://', '') + controller,
            pathIndex = fullUrl.indexOf('/'),
        protocol = this.settings.addr.substring(0, 4) == 'wss:' ? https : http,
            host = fullUrl.substring(0, pathIndex),
            path = fullUrl.substring(pathIndex),
            query = '?hub=' + encodeURIComponent(this.settings.identification.name) +
                    '&token=' + encodeURIComponent(this.settings.identification.token) +
                    '&node=' + encodeURIComponent(nodeName);

        const portIndex = host.indexOf(':'),
            port = undefined;
        if (portIndex !== -1) {
            port = parseInt(host.substring(portIndex + 1));
            host = host.substring(0, portIndex);
        }
        const options = {
            host: host,
            port: port,
            path: path + query,
            method: 'POST'
        };

        return protocol.request(options, function (res) {
            if (res.statusCode !== 200) {
                console.log('STATUS: ' + res.statusCode);
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                });
            }
        });
    }

    // uploadStream(stream) {
    //     try {
    //         const updateReq = this.beginUpload(false);	
    //         updateReq.on('error', function (err) {
    //             console.error('error uploading: ' + err.message);
    //         });

    //         stream.on('data', function (data) {
    //             try {
    //                 updateReq.write(data);
    //             } catch (ex) {
    //                 console.error('Error uploading stream data - ' + ex);
    //             }
    //         });

    //         stream.on('end', function () {
    //             try {
    //                 console.log('end upload');
    //                 updateReq.end();
    //             } catch (ex) {
    //                 console.error('Error ending upload of stream data - ' + ex);
    //             }
    //             updateReq = null;
    //         });
    //     } catch (ex) {
    //         console.error('Error starting upload of stream data - ' + ex);
    //     }
    // }

    uploadData(fileData) {
        return new Promise(resolve => {
            try {
                const updateReq = beginUpload(true);
                updateReq.on('error', function (err) {
                    console.error('error uploading: ' + err.message);
                    resolve();
                });

                try {
                    updateReq.write(fileData);
                    updateReq.end(resolve);
                } catch (ex) {
                    console.error('Error uploading snapshot file - ' + ex);
                    resolve()
                }
                updateReq = null;
            } catch (ex) {
                console.error('Error starting upload of snapshot data - ' + ex);
                resolve()
            }
        })
    }
}
module.exports = Uploader
