var events = require('events'),
  extend = require('extend'),
  fs = require('fs'),
  http = require('http'),
  https = require('https'),
  RaspiCam = require('raspicam'),
  RaspiCamMock = require('./test/raspicam-mock'),
  Motion = require('./motion');

function DeviceCamera(config, nodeName) {
  var self = this,
    states = { on: { _default: 'off' } },
    videoOn = false,
    socketClient,
    camera,
    hubSettings,
    timelapseMode = true,
    watchingTimelapse = false,
    detectingMotion = false,
    nightMode = false,
    updateReq,
    motion;

  var FILE_PATH = '../garageCam/',
    FILE_NAME = 'snapshot%06d.jpg';

  self.applySettings = function (s) {
    hubSettings = s;
  };

  self.setState = function (state) {
    var index = state.indexOf('.');

    if (index !== -1) {
      var name = state.substring(0, index),
        value = state.substring(index + 1);

      states.on[name] = value;

      if (name === 'motion') {
        detectingMotion = (value !== 'off');
        if (detectingMotion) {
          motion = new Motion(config.motion);
        }
      }
    } else if (state == 'night') {
      nightMode = true;
    } else if (state == 'day') {
      nightMode = false;
    } else {
      states.on._default = state;
    }

    var onValue = 'off';
    var timelapseOn = false;
    for (var name in states.on) {
      if (states.on.hasOwnProperty(name)) {
        if (states.on[name] !== 'off') {
          onValue = states.on[name];
          if (name !== 'motion' && onValue === 'timelapse') {
            timelapseOn = true;
          }
        }
        
      }
    }

    watchingTimelapse = false;
    if (onValue === 'timelapse') {
      watchingTimelapse = timelapseOn;
      start(true);
    } else if (onValue === 'h264') {
      start(false);
    } else {
      stop();
    }
  }

  function start(timelapse) {
    if (!videoOn) {
      timelapseMode = timelapse;
      startCamera();
      videoOn = true;
      self.emit('changed', timelapseMode ? 'timelapse' : 'h264');
    }
  }
  function stop() {
    stopCamera();

    if (videoOn) {
      videoOn = false;
      self.emit('changed', 'off');
    }
  }

  function startCamera() {
    var settings = getCameraSettings();

    camera = config.mock ? new RaspiCamMock(settings) : new RaspiCam(settings);

    camera.on("start", function (err, timestamp, stream) {
      console.log((timelapseMode ? 'timelapse' : 'video') + ' started');
      if (!timelapseMode) {
        uploadStream(stream);
      }
    });

    camera.on("exit", function () {
      camera = null;
      console.log((timelapseMode ? 'timelapse' : 'video') + ' finished');
      stop();
    });

    if (timelapseMode) {
      var uploadingFile = false;

      camera.on("read", function (err, timestamp, filename) {
        var filePath = FILE_PATH + filename;

        if (fs.existsSync(filePath)) {
          
          const detectedMovement = detectingMotion
              ? motion.check(filePath)
              : false;

          if (detectedMovement) {
            self.emit('changed', 'movement');
          }

          if ((!watchingTimelapse && !detectedMovement) || uploadingFile) {
            console.log('skipping snapshot: ' + filename);
            removeFile(filePath);
          } else {
            console.log("uploading snapshot: " + filename);
            uploadingFile = true;

            uploadFile(filePath, function () {
              removeFile(filePath);
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
      try {
        camera.stop();
      } catch (ex) {
        console.error('error stopping camera - ' + ex);
      }

      if (timelapseMode) {
        try {
          var files = fs.readdirSync(FILE_PATH);
          files.forEach(function (f) {
            console.log('removing file - ' + f);
            try {
              fs.unlinkSync(FILE_PATH + f);
            } catch (e) {
              console.log('error deleting file - ' + e);
            }
          });
        } catch (e) {
          console.error('error deleting files - ' + e);
        }
      }
    }
    if (updateReq) {
      try {
        updateReq.end();
      } catch (ex) {
        console.error('error ending upload request - ' + ex);
      }
    }
    camera = null;
    updateReq = null;
  }

  function removeFile(filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch (ex) {
      console.error('error deleting snapshot file - ' + ex);
      stop();
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
  }

  function uploadStream(stream) {
    try {
      beginUpload();
      updateReq.on('error', function (err) {
        console.error('error uploading: ' + err.message);
      });

      stream.on('data', function (data) {
        try {
          updateReq.write(data);
        } catch (ex) {
          console.error('Error uploading stream data - ' + ex);
          stop();
        }
      });

      stream.on('end', function () {
        try {
          console.log('end upload');
          updateReq.end();
        } catch (ex) {
          console.error('Error ending upload of stream data - ' + ex);
        }
        updateReq = null;
        stop();
      });
    } catch (ex) {
      console.error('Error starting upload of stream data - ' + ex);
      stop();
    }
  }

  function uploadFile(filePath, done) {
    try {
      beginUpload();
      updateReq.on('error', function (err) {
        console.error('error uploading: ' + err.message);
        done();
      });

      fs.readFile(filePath, function (err, data) {
        try {
          if (err) {
            console.error('error reading snapshot file - ' + err);
          } else {
            updateReq.write(data);
          }
          updateReq.end(done);

        } catch (ex) {
          console.error('Error uploading snapshot file "' + filePath + '" - ' + ex);
          done()
        }
        updateReq = null;
      });
    } catch (ex) {
      console.error('Error starting upload of snapshot data - ' + ex);
      stop();
      done()
    }
  }

  function getCameraSettings() {
    var camSettings = timelapseMode
      ? extend({
        mode: "timelapse",
        output: FILE_PATH + FILE_NAME
      }, config.timelapseSettings)
      : extend({
        mode: "video",
        output: "-"
      }, config.videoSettings);

    return extend({
      exposure: nightMode ? 'night' : 'auto',
      awb: nightMode ? 'incandescent' : 'shade',
      drc: nightMode ? 'high' : 'off'
    }, camSettings, config.settings);
  }

  this._test = function () {
    self.setState(videoOn ? "off" : "timelapse");
  };
}
DeviceCamera.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceCamera;
