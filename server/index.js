'use strict';

const express = require('express');
const Server = require('http').Server;
const socketIO = require('socket.io');

const app = express();
const server = Server(app);
const io = socketIO.listen(server);

const PORT = parseInt(process.env.PORT) || 5000;

app.use('/', express.static('static'));

io.on('connection', client => {
    setTimeout(() => playMessage('This is a test yolo', client), 1000);
});

server.listen(PORT, () => {
    console.log('Server started');
});

function playMessage(messageString, client) {
    client.emit('play-message', {
        'message': messageString,
        'file': '' // TODO
    });
}