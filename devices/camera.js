var events = require('events'),
    extend = require('extend'),
    fs = require('fs'),
    http = require('http'),
    RaspiCam = require('raspicam'),
    RaspiCamMock = require('./test/raspicam-mock');

function DeviceCamera(config, nodeName) {
    var self = this,
        videoOn = false,
        socketClient,
        camera,
        hubSettings,
        timelapseMode = true;

    var FILE_PATH = '../garageCam/',
        FILE_NAME = 'snapshot%06d.jpg';

    self.applySettings = function (s) {
        hubSettings = s;
    };

    self.setState = function (state) {
        var newOn = state === 'on';
        if (newOn !== videoOn) {
            if (newOn) {
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
                stream.on('data', function (data) {
                    if (socketClient) {
                        socketClient.send(data);
                    }
                })
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
            });
        }

        camera.start();
    }
    function stopCamera() {
        if (camera) {
            camera.stop();
            camera = null;
        }
    }

    function uploadFile(filePath, done) {
        var fullUrl = hubSettings.addr.replace('wss://', '').replace('ws://', '') + 'UploadSnapshot',
            pathIndex = fullUrl.indexOf('/'),
            host = fullUrl.substring(0, pathIndex),
            path = fullUrl.substring(pathIndex),
            query = '?hub=' + encodeURIComponent(hubSettings.identification.name) +
                    '&token=' + encodeURIComponent(hubSettings.identification.token) +
                    '&node=' + encodeURIComponent(nodeName);

        var portIndex = host.indexOf(':'),
            port = 80;
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

        var req = http.request(options, function (res) {
            if (res.statusCode !== 200) {
                console.log('STATUS: ' + res.statusCode);
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                });
            }
        });
        req.on('error', function (err) {
            console.error('error uploading: ' + err.message);
        });

        fs.readFile(filePath, function (err, data) {
            if (err) {
                console.error('error reading snapshot file - ' + err);
            } else {
                req.write(data);
            }
            req.end();

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
