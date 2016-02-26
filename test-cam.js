var RaspiCam = require('raspicam');

var camera = new RaspiCam({
    mode: "video",
    output: "-",
    framerate: 15,
    timeout: 5000 // take a 5 second video
});

camera.on("start", function (err, timestamp, stream) {
    console.log("video started");

    stream.on('data', function (data) {
        process.stdout.write(data.toString());
    })
});

camera.on("exit", function () {
    process.stdout.write('\n');
    console.log("video child process has exited");
});

camera.start();

setTimeout(function () {
    camera.stop();
}, 5000);
