'use strict';

const Chance = require('chance');

const Script = require('./script');

class RandomVideoScript extends Script {

    constructor(fetchVideos, interruptible = false) {
        super();
        this.fetchVideos = fetchVideos;
        this.interruptible = interruptible;
    }

    generateMessages() {
        return this.fetchVideos().then((allVideos) => {
            const chance = new Chance();
            const pick = chance.pickone(allVideos);

            return [{
                'videoId': pick.contentDetails.videoId,
                'interruptible': this.interruptible
            }];
        });
    }

}

module.exports = RandomVideoScript;
