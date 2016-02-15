var events = require('events'),
    spawn = require('child_process').spawn,
    readline = require('readline'),
    child = null;


function DeviceRFID(config) {
    var self = this;

    function startReading() {

	if (child) return;
console.log('spawning rfid reader: ' + config.read.cmd + ' ' + __dirname + '/' + config.read.path);
	child = spawn(config.read.cmd, [__dirname + '/' + config.read.path], { stdio: ['ignore', 'pipe', process.stderr] });
    	var linereader = readline.createInterface(child.stdout, child.stdin);

    	linereader.on('line', function (line) {
	    try {
	    	var data = JSON.parse(line)
	    	  , tagId = data.id;
console.log('tag: ' + tagId);
            	self.emit('changed', tagId);
	    }
	    catch(e)
	    {
		console.error('rfid: ' + line);
	    }
    	});

    	child.on('close', function(code) {
	    child = null;
    	});
    }

    function stopReading() {
	if (child) {
	    console.log('closing rfid reader');
	    child.kill();
	    child = null;
	}
    }

    self.setState = function (state) {
        if (state ==='on') {
	    startReading();
	} else {
	    stopReading();
	}
    }

    var testAlt = false;
    self._test = function () {
	testAlt = !testAlt;
        self.emit('changed', testAlt ? [4,3,2,1] : [1,2,3,4]);
    };

    // And the exit event shuts down the child.
    process.once("exit", function () {
	mainProcessShutdown = true;
	if (child) {
	    child.kill();
	}
    });

    // This is a somewhat ugly approach, but it has the advantage of working
    // in conjunction with most of what third parties might choose to do with
    // uncaughtException listeners, while preserving whatever the exception is.
    process.once("uncaughtException", function (error) {
	// If this was the last of the listeners, then shut down the child and rethrow.
	// Our assumption here is that any other code listening for an uncaught
	// exception is going to do the sensible thing and call process.exit().
	if (process.listeners("uncaughtException").length === 0) {
	    stopReading()
	    throw error;
	}
    });

}
DeviceRFID.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceRFID;
