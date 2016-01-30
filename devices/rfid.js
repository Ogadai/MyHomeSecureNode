var events = require('events'),
    rc522;

//try{
//    rc522 = require("rc522-rfid");
//    rc522(function(rfidSerialNumber){
//	console.log(rfidSerialNumber);
//    });
//}
//catch(e)
//{
//    console.error('Couldn\'t load rc522-frfid - ' + e);
//}

function DeviceRFID(config) {
    var self = this;

    if (rc522) {
//        rc522(function(rfidSerialNumber){
//	   console.log(rfidSerialNumber);
//        });
    }
}
DeviceRFID.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = DeviceRFID;
