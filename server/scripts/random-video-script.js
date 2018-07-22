'use strict';

const Chance = require('chance');

const Script = require('./script');

class RandomVideoScript extends Script {

    constructor(videoIds) {
        super();
        this.videoIds = videoIds;
    }

    generateMessages() {
        const chance = new Chance();
        return Promise.resolve([
            'Here is a random video',
            {'videoId': chance.pickone(this.videoIds)}
        ]);
    }

}

module.exports = RandomVideoScript;