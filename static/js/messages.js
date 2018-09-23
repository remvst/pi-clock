'use strict';

// Too lazy to rewrite this stuff
Promise.defer = function() {
    let stolenResolve;
    let stoleReject;

    const promise = new Promise((resolve, reject) => {
        stolenResolve = resolve;
        stoleReject = reject;
    });

    return {
        'resolve': stolenResolve,
        'reject': stoleReject,
        'promise': promise
    };
};

class Message {
    get interruptible() {
        return false;
    }

    show() {
        throw new Error();
    }

    stop() {
        throw new Error();
    }
}

class VoiceMessage extends Message {
    constructor(message, audioFileURL) {
        super();
        this.message = message;
        this.audioFileURL = audioFileURL;

        this.readyDeferred = Promise.defer();
        this.doneDeferred = Promise.defer();

        this.audio = new Audio();

        this.audio.addEventListener('canplay', () => {
            this.readyDeferred.resolve();
        }, false);
        this.audio.addEventListener('error', err => {
            this.readyDeferred.reject(err);
            this.doneDeferred.reject(err);
        });
        this.audio.addEventListener('ended', err => {
            this.doneDeferred.resolve();
        });

        this.audio.crossOrigin = 'anonymous';
        this.audio.src = this.audioFileURL;
    }

    show() {
        return this.readyDeferred.promise
            .then(() => {
                document.querySelector('#message-text').innerHTML = this.message;
                showSection('message');

                this.audio.play();
                return this.doneDeferred.promise;
            });
    }

    stop() {
        this.audio.pause();
        this.doneDeferred.resolve();
    }
}

class VideoMessage extends Message {
    constructor(videoId) {
        super();
        this.videoId = videoId;

        this.doneDeferred = Promise.defer();

        this.player = null;
    }

    show() {
        this.player = new YT.Player('video-container', {
            'width': '480',
            'height': '320',
            'videoId': this.videoId,
            'events': {
                'onReady': () => this.player.playVideo(),
                'onStateChange': event => {
                    const playerStatus = event.data;
                    if (playerStatus === 0) { // video ended
                        this.doneDeferred.resolve();
                    }
                },
                'onError': err => this.doneDeferred.reject(err)
            }
        });

        showSection('video');

        return this.doneDeferred.promise;
    }

    stop() {
        this.player.destroy();
        this.doneDeferred.resolve();
    }
}

class RadioMessage extends Message {
    constructor(radioURL) {
        super();
        this.radioURL = radioURL;

        this.readyDeferred = Promise.defer();
        this.doneDeferred = Promise.defer();

        this.audio = new Audio();

        this.audio.addEventListener('canplay', () => {
            this.readyDeferred.resolve();
        }, false);
        this.audio.addEventListener('error', err => {
            this.readyDeferred.reject(err);
            this.doneDeferred.reject(err);
        });
        this.audio.addEventListener('ended', err => {
            this.doneDeferred.resolve();
        });

        this.audio.crossOrigin = 'anonymous';
        this.audio.src = this.radioURL;
    }

    show() {
        return this.readyDeferred.promise
            .then(() => {
                setTimeout(() => {
                    this.doneDeferred.resolve();
                }, 60 * 60 * 1000);

                document.querySelector('#message-text').innerHTML = 'Playing radio...';
                showSection('message');

                this.audio.play();

                return this.doneDeferred.promise;
            });
    }

    stop() {
        this.audio.pause();
        this.doneDeferred.resolve();
    }

    get interruptible() {
        return true;
    }
}

class PictureMessage extends Message {
    constructor(pictureUrl) {
        super();

        this.pictureUrl = pictureUrl;

        this.doneDeferred = Promise.defer();
    }

    show() {
        setTimeout(() => {
            this.doneDeferred.resolve();
        }, 500000);

        document.querySelector('#picture').style.backgroundImage = 'url("' + this.pictureUrl + '")';
        showSection('picture');
        return this.doneDeferred.promise;
    }

    stop() {
        this.doneDeferred.resolve();
    }

    get interruptible() {
        return true;
    }
}
