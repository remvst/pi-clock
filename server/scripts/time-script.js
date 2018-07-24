'use strict';

const Script = require('./script');
const addZeroes = require('../add-zeroes');

class TimeScript extends Script {

    generateMessages() {
        const now = new Date();
        return Promise.resolve([
            'It is ' + addZeroes(now.getHours(), 2) + ':' + addZeroes(now.getMinutes(), 2)
        ]);
    }

}

module.exports = TimeScript;