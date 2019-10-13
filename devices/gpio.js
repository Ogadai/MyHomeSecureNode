const settings = require('../settings')

if (settings.onoff !== 'disable') {
    try
    {
        var Gpio = require('onoff').Gpio;
        module.exports = Gpio;
    }
    catch(e)
    {
        console.error('Couldn\'t load Gpio - ' + e);
        module.exports = null;
    }
} else {
    module.exports = null;
}
