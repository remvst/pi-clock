'use strict';

const Chance = require('chance');

const Script = require('./script');

class RandomVideoScript extends Script {

    constructor(videoIds, interruptible = false) {
        super();
        this.videoIds = videoIds;
        this.interruptible = interruptible;
    }

    generateMessages() {
        const chance = new Chance();
        return Promise.resolve([{
            'videoId': chance.pickone(this.videoIds),
            'interruptible': this.interruptible
        }]);
    }

}

module.exports = RandomVideoScript;
