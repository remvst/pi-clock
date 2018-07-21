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

app.use('/tmp', express.static('tmp'));
app.use('/', express.static('static'));

io.on('connection', client => {
    // setTimeout(() => playMessages(['Clock is ready'], client), 1000);

    client.on('test-message', () => {
        playMessages(['Test message', 'Hopefully it\'ll work'], client);
    });
});

server.listen(PORT, () => {
    console.log('Server started');
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
        .catch(err => console.err(err));
}