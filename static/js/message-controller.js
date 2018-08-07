'use strict';

class MessageController {

    constructor() {
        this.queue = [];
        this.currentMessage = null;
    }

    addToQueue(messageData) {
        const parsed = this.parse(messageData);
        this.queue.push(parsed);
        
        console.log(parsed);

        if (!this.currentMessage || this.currentMessage.interruptible) {
            this.processNextMessage();
        }
    }

    parse(messageData) {
        if (messageData.message) {
            return new VoiceMessage(messageData.message, messageData.url);
        } else if (messageData.videoId) {
            return new VideoMessage(messageData.videoId);
        } else if (messageData.radioUrl) {
            return new RadioMessage(messageData.radioUrl);
        }

        throw new Error('Invalid message');
    }

    skipMessage() {
        if (!this.currentMessage) {
            return;
        }

        this.currentMessage.stop();
        this.currentMessage = null;
    }

    processNextMessage() {
        this.currentMessage = null;

        showSection('clock');

        const message = this.queue.shift();
        if (!message) {
            return;
        }

        this.currentMessage = message;
        this.currentMessage.show()
            .catch(err => console.error(err))
            .then(() => this.processNextMessage());
    }

}