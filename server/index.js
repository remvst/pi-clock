'use strict';

const express = require('express');
const Server = require('http').Server;
const socketIO = require('socket.io');
const googleTTS = require('google-tts-api');
const rp = require('request-promise');
const fs = require('fs-extra');
const uuid = require('uuid4');

const app = express();
const server = Server(app);
const io = socketIO.listen(server);

const PORT = parseInt(process.env.PORT) || 5000;

const ALARM_TIMES = [
    // {'dayOfWeek': 6, 'millisecondsInDay': 10 * 24 * 3600},
    {'dayOfWeek': 6, 'millisecondsInDay': millisecondsInDay(new Date()) + 10000}
];

let LAST_ALARM_CHECK = new Date();
const CLIENTS = [];

app.use('/tmp', express.static('tmp'));
app.use('/', express.static('static'));

io.on('connection', client => {
    // setTimeout(() => playMessages(['Clock is ready'], client), 1000);

    client.on('test-message', () => {
        playMessages(['Test message', 'Hopefully it\'ll work'], client);
    });
    checkAlarm();
});

server.listen(PORT, () => {
    console.log('Server started');

    setInterval(checkAlarm, 1000);
});

function playMessages(messageStrings, client) {
    Promise.all(messageStrings
        .map(messageString => {
            return googleTTS(messageString, 'en', 1)
                .then(url => {
                    const file = '/tmp/' + uuid() + '.mp3';
                    return rp({'uri': url, 'encoding': null})
                        .then(contents => fs.outputFile(__dirname + '/..' + file, contents))
                        .then(() => {
                            return {
                                'url': file,
                                'message': messageString
                            };
                        });
                })
        }))
        .then(messagesSettings => {
            messagesSettings.forEach(settings => {
                client.emit('play-message', {
                    'message': settings.message,
                    'url': settings.url
                });
            });
        })
        .catch(err => console.error(err));
}

function millisecondsInDay(date) {
    return (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) * 1000;
}

function ring() {
    io.sockets.clients((err, clients) => {
        if (err) {
            console.error(err);
            return;
        }

        clients.forEach(socketId => {
            const client = io.sockets.connected[socketId];
            playMessages(['Time to ring'], client);
        });
    });
}

function checkAlarm() {
    const now = new Date();

    let shouldRing = false;
    ALARM_TIMES
        .filter(time => time.dayOfWeek === now.getDay())
        .forEach(settings => {
            const before = millisecondsInDay(LAST_ALARM_CHECK) - settings.millisecondsInDay > 0;
            const after = millisecondsInDay(now) - settings.millisecondsInDay > 0;
            
            if (before !== after) {
                shouldRing = true;
            }
        });

    if (shouldRing) {
        ring();
    }

    LAST_ALARM_CHECK = now;
}