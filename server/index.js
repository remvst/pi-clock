'use strict';

const express = require('express');
const Server = require('http').Server;
const socketIO = require('socket.io');
const googleTTS = require('google-tts-api');
const rp = require('request-promise');
const fs = require('fs-extra');
const uuid = require('uuid4');

const Clients = require('./clients');
const GoogleCalendar = require('./google-calendar');
const OpenWeatherMap = require('./open-weather-map');
const AlarmClock = require('./alarm-clock');
const QuoteOfTheDay = require('./quote-of-the-day');
const News = require('./news');

const config = require('../config');

const GoogleCalendarScript = require('./scripts/google-calendar-script');
const TimeScript = require('./scripts/time-script');
const StaticScript = require('./scripts/static-script');
const WeatherScript = require('./scripts/weather-script');
const QuoteOfTheDayScript = require('./scripts/quote-of-the-day-script');
const NewsScript = require('./scripts/news-script');
const RandomVideoScript = require('./scripts/random-video-script');

const PORT = parseInt(config.PORT) || 5000;
const LATITUDE = parseFloat(config.LATITUDE) || 0;
const LONGITUDE = parseFloat(config.LONGITUDE) || 0;
const WEATHER_API_KEY = config.WEATHER_API_KEY;
const NEWS_API_KEY = config.NEWS_API_KEY;
const CREDENTIALS_PATH = config.CREDENTIALS_PATH || 'credentials.json';
const TOKEN_PATH = config.TOKEN_PATH || 'token.json';

const app = express();
const server = Server(app);
const io = socketIO.listen(server);

const clients = new Clients(io);

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

    setInterval(() => alarm.tick(), 1000);
    setInterval(broadcastWeather, 30000);
});

// APIs
const gc = new GoogleCalendar({
    'credentialsPath': CREDENTIALS_PATH,
    'tokenPath': TOKEN_PATH
});

// gc.events(new Date(), new Date(Date.now() + 24 * 3600 * 1000))
//     .then(events => {
//         console.log(events);
//     });

const weather = new OpenWeatherMap({
    'apiKey': WEATHER_API_KEY,
    'latitude': LATITUDE,
    'longitude': LONGITUDE
});

const quote = new QuoteOfTheDay();

const news = new News({
    'apiKey': NEWS_API_KEY,
    'source': 'bbc-news'
});

// Scripts
const scripts = [
    new StaticScript(['Good morning Remi']),
    new TimeScript(),
    new GoogleCalendarScript(gc),
    new WeatherScript(weather),
    new NewsScript(news),
    new QuoteOfTheDayScript(quote),
    new RandomVideoScript(config.VIDEO_IDS),
    new StaticScript(['Have an amazing day'])
];

// Alarm
const alarm = new AlarmClock();
alarm.addRecurrentAlarm(0, 10 * 3600 * 1000);
alarm.addRecurrentAlarm(1, 8.5 * 3600 * 1000);
alarm.addRecurrentAlarm(2, 8.5 * 3600 * 1000);
alarm.addRecurrentAlarm(3, 8.5 * 3600 * 1000);
alarm.addRecurrentAlarm(4, 8.5 * 3600 * 1000);
alarm.addRecurrentAlarm(5, 8.5 * 3600 * 1000);
alarm.addRecurrentAlarm(6, 10 * 3600 * 1000);
alarm.addRecurrentAlarm(2, alarm.millisecondsInDay(new Date()) + 5000);

alarm.ringCallback = () => {

    Promise.all(scripts.map(script => {
        return script.generateMessages()
            .catch(err => {
                console.error(err);
                return ['Script error'];
            });
    })).then(results => {
        let messages = [];
        results.forEach(result => {
            messages = messages.concat(result);
        })
        console.log(messages);
        clients.forEach(client => {
            playMessages(messages, client);
        });
    });

    broadcastNextAlarm();
};

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
    Promise.all(messages.filter(m => m).map(message => convertMessageSettings(message)))
        .then(messagesSettings => {
            messagesSettings.forEach(settings => {
                client.emit('play-message', settings);
            });
        })
        .catch(err => console.error(err));
}

function broadcastNextAlarm() {
    const nextAlarm = alarm.nextAlarmTime();

    clients.forEach(client => {
        client.emit('next-alarm', {'time': nextAlarm.getTime()});
    });
}

function broadcastWeather() {
    weather.fetchForecast()
        .then(weather => {
            clients.forEach(client => client.emit('weather', weather));
        });
}