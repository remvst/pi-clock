'use strict';

const Script = require('./script');

class TimeScript extends Script {

    generateMessages() {
        const now = new Date();
        return Promise.resolve([
            'It is ' + now.getHours() + ':' + now.getMinutes()
        ]);
    }

}

module.exports = TimeScript;