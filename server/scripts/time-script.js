'use strict';

const moment = require('moment');

const Script = require('./script');

class TimeScript extends Script {

    generateMessages() {
        return Promise.resolve([
            'It is ' + moment(new Date()).format('LT')
        ]);
    }

}

module.exports = TimeScript;