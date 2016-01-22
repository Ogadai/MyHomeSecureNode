var HubClient = require('./hub-client'),
    Node = require('./node'),
    DeviceList = require('./device-list'),
    settings = require('./settings'),
    keypress = require("keypress");

var hubClient = new HubClient(settings.hubPort),
    deviceList = new DeviceList(settings.devices),
    node = new Node(settings.name, hubClient, deviceList);

hubClient.connect();

keypress(process.stdin);
process.stdin.on('keypress', function (ch, key) {
    if (key) {
        switch (key.name) {
            case 'c':
                if (key.ctrl) {
                    process.exit(0);
                }
                break;
            default:
                settings.devices.forEach(function (config) {
                    if (config.testKey === key.name) {
                        var device = deviceList.getDevice(config.name);
                        if (device._test) {
                            device._test();
                        }
                    }
                });
                break;
        }
    }
});

if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}
process.stdin.resume();
