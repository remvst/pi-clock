'use strict';

const chance = require('chance');

const Script = require('./script');

class RandomVideoScript extends Script {

    constructor(videoIds) {
        super();
        this.videoIds = videoIds;
    }

    generateMessages() {
        return Promise.resolve([
            'Here is a random video',
            {'videoId': chance.pickone(this.videoIds)}
        ]);
    }

}

module.exports = RandomVideoScript;