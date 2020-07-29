var HubClient = require('./hub-client'),
    Node = require('./node'),
    DeviceList = require('./device-list')
    SocketServer = require('./socket-server'),
    settings = require('./settings'),
    keypress = require("keypress");

var hubClient = new HubClient(settings.hubServer || 'localhost', settings.hubPort),
    deviceList = new DeviceList(settings.devices, settings.name),
    node = new Node(settings.name, hubClient, deviceList),
    socketServer = null;

hubClient.connect();

if (settings.stream) {
    socketServer = new SocketServer(hubClient, deviceList, settings.stream);
}

keypress(process.stdin);
process.stdin.on('keypress', function (ch, key) {
    if (key) {
        if (key.ctrl) {
            switch (key.name) {
                case 'c':
                    console.log('disconnecting devices');
                    deviceList.disconnectAll();
                    if (socketServer) socketServer.close();
                    process.exit(0);
                    break;
            }
        } else {
            settings.devices.forEach(function (config) {
                if (config.testKey === key.name) {
                    var device = deviceList.getDevice(config.name);
                    if (device._test) {
                        device._test();
                    }
                }
            });
        }
    }
});

if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}
process.stdin.resume();

function exitHandler(options, err) {
    if (options.cleanup) {
        deviceList.disconnectAll();
        if (socketServer) socketServer.close();
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
