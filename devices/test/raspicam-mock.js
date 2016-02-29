var events = require('events'),
    fs = require('fs');

function RaspiCamMock(opts) {
    var self = this,
        interval,
        testImage = './devices/test/test.jpg';

    this.start = function () {
        self.emit('start', 'message', 0);
        console.log('timelapse: ' + opts.timelapse);
        var index = 1;
        interval = setInterval(function () {
            var filePath = opts.output.replace("%06d", index.toLocaleString('en-GB', { minimumIntegerDigits: 6, useGrouping: false })),
                fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

            copyFile(testImage, filePath, function() {
                self.emit('read', null, null, fileName);
            });

            index++;
        }, opts.timelapse);
    }

    this.stop = function () {
        clearInterval(interval);
        self.emit('exit')
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
