var events = require('events'),
    fs = require('fs');

function RaspiCamMock(opts) {
    var self = this,
        interval,
        testImages = opts.testFiles
                ? fs.readdirSync(opts.testFiles).map(f => `${opts.testFiles}/${f}`)
                : ['./devices/test/garage/08-04-04.783.jpg'],
        testImageIndex = 0;
        testVideo = './devices/test/output.h264';

    this.start = function () {
        if (opts.mode == 'video') {
            videoStart();
        } else {
            timelapseStart();
        }
    }
    this.stop = function () {
        if (opts.mode == 'video') {
            videoStop();
        } else {
            timelapseStop();
        }
        self.emit('exit')
    }

    var fileData
    function videoStart() {
        var videoEmitter = new events.EventEmitter();
        self.emit('start', 'message', 0, videoEmitter);

        fileData = fs.openSync(testVideo, 'r');
        var bytesPerChunk = 5000;
        var buffer = new Buffer(bytesPerChunk);
        interval = setInterval(function () {
            fs.read(fileData, buffer, 0, bytesPerChunk, null, function (err, bytesRead, buffer) {
                var useBuffer = buffer,
                    endOfFile = false;
                if (bytesRead < bytesPerChunk) {
                    useBuffer = buffer.slice(0, bytesRead);
                    endOfFile = true;
                }

                videoEmitter.emit('data', useBuffer);

                if (endOfFile) {
                    clearInterval(interval);
                    videoEmitter.emit('end');
                }
            });
        }, 1);
    }
    function videoStop() {
        clearInterval(interval);
        fs.closeSync(fileData);
        fileData = null;
    }

    function timelapseStart() {
        self.emit('start', 'message', 0);
        var intervalMS = opts.timelapse ? opts.timelapse : 1000;
        console.log('timelapse: ' + intervalMS);
        var index = 1;
        interval = setInterval(function () {
            var filePath = opts.output.replace("%06d", index.toLocaleString('en-GB', { minimumIntegerDigits: 6, useGrouping: false })),
                fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

            copyFile(testImages[testImageIndex], filePath, function() {
                self.emit('read', null, null, fileName);
            });
            testImageIndex++;
            if (testImageIndex >= testImages.length) testImageIndex = 0;

            index++;
        }, intervalMS);
    }

    function timelapseStop() {
        clearInterval(interval);
    }

    function copyFile(source, target, done) {

        var rd = fs.createReadStream(source);
        rd.on("error", function(err) {
            console.error('Error reading sample image - ' + err);
        });
        var wr = fs.createWriteStream(target);
        wr.on("error", function(err) {
            console.error('Error writing snapshot - ' + err);
        });
        wr.on("close", function(ex) {
            done();
        });
        rd.pipe(wr);
    }
}
RaspiCamMock.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = RaspiCamMock;
