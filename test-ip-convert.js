"use strict"
const IPCamConverter = require('./ip_cam_converter')

runTest();

async function runTest() {
  const converter = new IPCamConverter({
    videoPath: '../cam/gate',
    rootPath: '../../ftp/gate',
    videoRegEx: /^\/(?<year>\d\d\d\d)(?<month>\d\d)(?<day>\d\d)\/record\/.\d*_(?<hour>\d\d)(?<minute>\d\d)(?<second>\d\d)_\d*.264/,
    imageRegEx: /^\/(?<year>\d\d\d\d)(?<month>\d\d)(?<day>\d\d)\/images\/.\d\d\d\d\d\d(?<hour>\d\d)(?<minute>\d\d)(?<second>\d\d)\d\d.jpg/,
    folderRegEx: /^\/(?<year>\d\d\d\d)(?<month>\d\d)(?<day>\d\d)/
  });

  await converter.execute();
}
