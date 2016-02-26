var events = require('events'),
    extend = require('extend'),
    RaspiCam = require('raspicam'),
    RaspiCamMock = require('./test/raspicam-mock'),
    W3CWebSocket = require('websocket').w3cwebsocket;

function DeviceCamera(config, nodeName) {
    var self = this,
        videoOn = false,
        socketClient,
        camera,
        hubSettings;

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
        openSocket(function () {
            startCamera();
            videoOn = true;
        });
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

            stream.on('data', function (data) {
                if (socketClient) {
                    socketClient.send(data);
                }
            })
        });

        camera.on("exit", function () {
            process.stdout.write('\n');
            console.log("video child process has exited");
            closeSocket();
        });

        camera.start();
    }
    function stopCamera() {
        if (camera) {
            camera.stop();
            camera = null;
        }
    }

    function openSocket(callbackFn) {
        socketClient = new W3CWebSocket(hubSettings.addr + 'camera', 'echo-protocol');
        socketClient.onopen = function () {
            console.log((new Date()).toLocaleTimeString() + ': Connected to Azure camera feed');

            var initialiseData = {
                Method: 'Initialise',
                Name: hubSettings.identification.name,
                Token: hubSettings.identification.token,
                Node: nodeName
            };
            socketClient.send(JSON.stringify(initialiseData));

            callbackFn()
        };

        socketClient.onclose = function () {
            console.log('Disconnected from Azure camera feed');
            socketClient = null;
            stop()
        };

        socketClient.onerror = function () {
            console.log('Error connecting to Azure camera feed');
            socketClient = null;
            stop()
        };
    }

    function closeSocket() {
        if (socketClient) {
            socketClient.close();
            socketClient = null;
        }
    }

    function getCameraSettings() {
        return extend({}, {
            mode: "video",
            output: "-",
            framerate: 15,
            timeout: 0
        }, config.settings);
    }

    this._test = function () {
        self.setState(videoOn ? "off" : "on");
    };
}
DeviceCamera.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceCamera;
