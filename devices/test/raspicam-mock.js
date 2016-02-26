var events = require('events');

function RaspiCamMock(opts) {
    var self = this,
        interval;

    this.start = function () {
        var dataEmitter = new events.EventEmitter();
        self.emit('start', 'message', 0, dataEmitter);

        interval = setInterval(function () {
            var message = Math.round(Math.random() * 10).toString();
            dataEmitter.emit('data', message);
        }, 1000 / opts.framerate);
    }

    this.stop = function () {
        clearInterval(interval);
        self.emit('exit')
    }

}
RaspiCamMock.prototype.__proto__ = events.EventEmitter.prototype;



module.exports = RaspiCamMock;
