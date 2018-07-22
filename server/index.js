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
const LATITUDE = parseFloat(process.env.LATITUDE) || 0;
const LONGITUDE = parseFloat(process.env.LONGITUDE) || 0;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const ALARM_TIMES = [
    {'dayOfWeek': 0, 'millisecondsInDay': 10 * 3600 * 1000},
    {'dayOfWeek': 1, 'millisecondsInDay': 8.5 * 3600 * 1000},
    {'dayOfWeek': 2, 'millisecondsInDay': 8.5 * 3600 * 1000},
    {'dayOfWeek': 3, 'millisecondsInDay': 8.5 * 3600 * 1000},
    {'dayOfWeek': 4, 'millisecondsInDay': 8.5 * 3600 * 1000},
    {'dayOfWeek': 5, 'millisecondsInDay': 8.5 * 3600 * 1000},
    {'dayOfWeek': 6, 'millisecondsInDay': 10 * 3600 * 1000},
];

let LAST_ALARM_CHECK = new Date();
const CLIENTS = [];

app.use('/tmp', express.static('tmp'));
app.use('/', express.static('static'));

io.on('connection', client => {
    client.on('test-message', () => {
        playMessages(['Test message', {'videoId': 'dQw4w9WgXcQ'}, 'Hopefully it worked'], client);
    });

    broadcastNextAlarm();
    broadcastWeather();
});

server.listen(PORT, () => {
    console.log('Server started');

    setInterval(checkAlarm, 1000);
    setInterval(broadcastWeather, 30000);
});

function convertMessageSettings(message) {
    // Text message: go google translate
    if (typeof message === 'string') {
        return googleTTS(message, 'en', 1)
            .then(url => {
                const file = '/tmp/' + uuid() + '.mp3';
                return rp({'uri': url, 'encoding': null})
                    .then(contents => fs.outputFile(__dirname + '/..' + file, contents))
                    .then(() => {
                        return {
                            'url': file,
                            'message': message
                        };
                    });
            }); 
    }
    
    // Video message: send the video ID
    if (message.videoId) {
        return Promise.resolve({
            'videoId': message.videoId
        });
    }

    return Promise.reject(new Error('Invalid message'));
}

function playMessages(messages, client) {
    Promise.all(messages.map(message => convertMessageSettings(message)))
        .then(messagesSettings => {
            messagesSettings.forEach(settings => {
                client.emit('play-message', settings);
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

    cycleAlarms();

    broadcastNextAlarm();
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

function cycleAlarms() {
    const now = new Date();

    if (ALARM_TIMES.length <= 1) {
        return;
    }

    ALARM_TIMES.sort((a, b) => {
        const nextTimeA = nextAlarmTime(a);
        const nextTimeB = nextAlarmTime(b);

        return nextTimeA.getTime() - nextTimeB.getTime();
    });
}

function broadcastNextAlarm() {
    const nextAlarm = nextAlarmTime(nextAlarmSetting());

    io.sockets.clients((err, clients) => {
        if (err) {
            console.error(err);
            return;
        }

        clients.forEach(socketId => {
            const client = io.sockets.connected[socketId];
            client.emit('next-alarm', {
                'time': nextAlarm.getTime()
            });
        });
    });
}

function nextAlarmSetting() {
    cycleAlarms();
    return ALARM_TIMES[0];
}

function nextAlarmTime(setting) {
    const now = new Date();
    const currentDay = now.getDay();

    let dayDifference = setting.dayOfWeek - currentDay;
    while (dayDifference < 0 || dayDifference === 0 && millisecondsInDay(now) > setting.millisecondsInDay) {
        dayDifference += 7;
    }

    // Create a date at that day
    const date = new Date(now.getTime() + dayDifference * 24 * 3600 * 1000);
    date.setHours(0, 0, 0, 0);
    date.setMilliseconds(setting.millisecondsInDay);

    return date;
}

function fetchWeather() {
    const url = 'http://api.openweathermap.org/data/2.5/forecast?lat=' + LATITUDE + '&lon=' + LONGITUDE + '&APPID=' + WEATHER_API_KEY;

    return rp({
        'uri': url,
        'json': true
    });
}

function broadcastWeather() {
    fetchWeather()
        .then(weather => {
            io.sockets.clients((err, clients) => {
                if (err) {
                    console.error(err);
                    return;
                }
        
                clients.forEach(socketId => {
                    const client = io.sockets.connected[socketId];
                    client.emit('weather', weather);
                });
            });
        });
}