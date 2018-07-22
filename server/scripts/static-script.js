'use strict';

const Script = require('./script');

class StaticScript extends Script {

    constructor(messages) {
        super();
        this.messages = messages;
    }

    generateMessages() {
        return Promise.resolve(this.messages.slice(0));
    }

}

module.exports = StaticScript;