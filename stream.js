"use strict"
const EventEmitter = require('events');

class Stream extends EventEmitter {
    constructor(camera) {
        super();
        this.camera = camera;

        this.state = null;
        this.initialised = false;
        this.unsubscribe;
    }

    setState(state) {
        if (!this.state) {
            this.unsubscribe = this.camera.startStreamClient(this);
        }
        this.state = state;
    }

    setupFrames(frames) {
        frames.forEach(frame => {
            this.emit('frame', frame);
        });
    }

    frame(frame, isFullFrame) {
        const sendFrame = (this.initialised && this.state === 'on')
            || (isFullFrame && (this.state === 'timelapse' || this.state === 'snapshot' || this.state === 'on'));

        if (sendFrame) {
            this.emit('frame', frame);

            this.initialised = true;
            if (this.state === 'snapshot') {
                this.state = 'pause';
            }
        }
    }

    motion() {
        this.emit('motion');
    }
    
    close() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
module.exports = Stream;
