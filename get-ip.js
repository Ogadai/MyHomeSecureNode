"use strict"

const os = require('os');

function getIP() {
  let ifaces = os.networkInterfaces(),
      addresses = [];

  Object.keys(ifaces).forEach(function (ifname) {

    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }

      console.log('ip address: ', iface.address);
      addresses.push(iface.address);
    });

  });
  return addresses.length ? addresses[0] : 'localhost';
}

module.exports = getIP;
