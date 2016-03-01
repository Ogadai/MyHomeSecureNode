var events = require('events'),
    extend = require('extend'),
    fs = require('fs'),
    http = require('http'),
    https = require('https'),
    RaspiCam = require('raspicam'),
    RaspiCamMock = require('./test/raspicam-mock');

function DeviceCamera(config, nodeName) {
    var self = this,
        videoOn = false,
        socketClient,
        camera,
        hubSettings,
        timelapseMode = true,
	updateReq;

    var FILE_PATH = '../garageCam/',
        FILE_NAME = 'snapshot%06d.jpg';

    self.applySettings = function (s) {
        hubSettings = s;
    };

    self.setState = function (state) {
        var newOn = (state !== 'off');
        if (newOn !== videoOn) {
            if (newOn) {
		timelapseMode = (state === 'timelapse');
                start();
            } else {
                stop();
            }
        }
    }

    function start() {
        startCamera();
        videoOn = true;
    }
    function stop() {
        stopCamera();
        videoOn = false;
    }

    function startCamera() {
        var settings = getCameraSettings();

        camera = config.mock ? new RaspiCamMock(settings) : new RaspiCam(settings);

        camera.on("start", function (err, timestamp, stream) {
            console.log("video started");
	    if (!timelapseMode) {
	    	uploadStream(stream);
	    }
        });

        camera.on("exit", function () {
            process.stdout.write('\n');
            console.log("video child process has exited");
        });

        if (timelapseMode) {
            var uploadingFile = false;

            camera.on("read", function (err, timestamp, filename) {
                var filePath = FILE_PATH + filename;

		if (fs.existsSync(filePath)) {
                  if (uploadingFile) {
                    console.log('skipping snapshot: ' + filename);
                    fs.unlink(filePath);
                  } else {
                    console.log("uploading snapshot: " + filename);
                    uploadingFile = true;

                    uploadFile(filePath, function () {
                        fs.unlink(filePath);
                        uploadingFile = false;
                    });
                  }
		}
            });
        }

        camera.start();
    }
    function stopCamera() {
        if (camera) {
            camera.stop();
            camera = null;
        }
	if(updateReq) {
	    updateReq.end();
    	    updateReq = null;
	}
    }

    function beginUpload() {
	var controller = timelapseMode ? 'UploadSnapshot' : 'UploadStream',
            fullUrl = hubSettings.addr.replace('wss://', '').replace('ws://', '') + controller,
            pathIndex = fullUrl.indexOf('/'),
	    protocol = hubSettings.addr.substring(0, 4) == 'wss:' ? https : http,
            host = fullUrl.substring(0, pathIndex),
            path = fullUrl.substring(pathIndex),
            query = '?hub=' + encodeURIComponent(hubSettings.identification.name) +
                    '&token=' + encodeURIComponent(hubSettings.identification.token) +
                    '&node=' + encodeURIComponent(nodeName);

        var portIndex = host.indexOf(':'),
            port = undefined;
        if (portIndex !== -1) {
            port = parseInt(host.substring(portIndex + 1));
            host = host.substring(0, portIndex);
        }
        var options = {
            host: host,
            port: port,
            path: path + query,
            method: 'POST'
        };

	updateReq = protocol.request(options, function (res) {
            if (res.statusCode !== 200) {
                console.log('STATUS: ' + res.statusCode);
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                });
            }
        });
        updateReq.on('error', function (err) {
            console.error('error uploading: ' + err.message);
        });
    }

    var bytesDone = 0
    function uploadStream(stream) {
	  beginUpload();	

	  stream.on('data', function(data) {
	      bytesDone += data.length;
	      console.log('uploaded: ' + bytesDone);
	      updateReq.write(data);
	  });

	  stream.on('end', function () {
	      console.log('end upload');
	      updateReq.end();
	      updateReq = null;
	      stop();
	  });
    }

    function uploadFile(filePath, done) {
	beginUpload();	

        fs.readFile(filePath, function (err, data) {
            if (err) {
                console.error('error reading snapshot file - ' + err);
            } else {
                updateReq.write(data);
            }
            updateReq.end();
	    updateReq = null;

            done();
        });
    }

    function getCameraSettings() {
        var camSettings = timelapseMode ? {
            mode: "timelapse",
            output: FILE_PATH + FILE_NAME,
            timelapse: 1000,
            timeout: 0
        } : {
            mode: "video",
            output: "-",
            framerate: 15,
            timeout: 0
        };
        return extend({}, camSettings, config.settings);
    }

    this._test = function () {
        self.setState(videoOn ? "off" : "on");
    };
}
DeviceCamera.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceCamera;
