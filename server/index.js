'use strict';

const express = require('express');
const Server = require('http').Server;
const socketIO = require('socket.io');
const googleTTS = require('google-tts-api');
const rp = require('request-promise');
const fs = require('fs-extra');
const uuid = require('uuid4');
const { exec } = require('child_process');
const espeak = require('espeak');
const bunyan = require('bunyan');

const Clients = require('./clients');
const GoogleCalendar = require('./google-calendar');
const Youtube = require('./youtube');
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

const log = bunyan.createLogger({'name': 'pi-clock'});

const clients = new Clients(io, log);

app.use('/tmp', express.static('/tmp/pi-clock'));
app.use('/frames', express.static('frames'));
app.use('/', express.static('static'));

server.listen(PORT, () => {
    log.info('Server started on port ' + PORT);

    setInterval(() => alarm.tick(), 1000);
    setInterval(broadcastWeather, 5 * 60 * 1000);
});

setInterval(() => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    log.info(`Heap: ${Math.round(used * 100) / 100} MB`);
}, 30000);



// APIs
const gc = new GoogleCalendar({
    'credentialsPath': CREDENTIALS_PATH,
    'tokenPath': TOKEN_PATH,
    'log': log
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

const youtube = new Youtube({
    'log': log,
    'apiKey': config.YOUTUBE_API_KEY
});

const fetchAlarmVideos = () => youtube.videosInPlaylist(config.ALARM_PLAYLIST_ID);
const fetchPrealarmVideos = () => youtube.videosInPlaylist(config.PRE_ALARM_PLAYLIST_ID);

// Scripts
const alarmVideoScript = new RandomVideoScript(fetchAlarmVideos);
const wakeUpScripts = [new RandomVideoScript(fetchPrealarmVideos, true)];

const alarmScripts = [
    new StaticScript(['Good morning Remi', 'Time to wake up']),
    new TimeScript(),
    new GoogleCalendarScript(gc),
    new WeatherScript(weather),
    new NewsScript(news),
    new QuoteOfTheDayScript(quote),
    alarmVideoScript,
    alarmVideoScript,
    alarmVideoScript,
    new StaticScript(['Have an amazing day'])
];

// Alarm
const alarm = new AlarmClock(log);

alarm.ringCallback = event => {
    const title = event.title || '';

    if (title === 'wakeup') {
        generateScriptMessagesAndBroadcast(wakeUpScripts);
        broadcastNextAlarm();
    } else if (title.indexOf('alarm') >= 0) {
        generateScriptMessagesAndBroadcast(alarmScripts);
        broadcastNextAlarm();
    } else {
        clients.forEach(client => {
            playMessages(['Event starting now', event.title || 'Unknown'], client);

            if (title.toLowerCase().indexOf('video') >= 0) {
                alarmVideoScript.generateMessages().then(messages => playMessages(messages, client));
            }
        });
    }
};

io.on('connection', client => {
    client.on('test-message', () => {
        playMessages(['Test message', {'videoId': 'dQw4w9WgXcQ'}, 'Hopefully it worked'], client);
    });

    client.on('sleep-radio', () => {
        playMessages([{'radioUrl': config.SLEEP_RADIO_URL}], client);
    });

    client.on('hello', () => {
        playMessages(['PI clock connected'], client);
    });

    client.on('alarm', () => {
        playMessages(['Triggering alarm messages...'], client);
        alarm.ringCallback({'title': 'alarm'});
    });

    broadcastNextAlarm();
    broadcastWeather();
});

setupAlarmsForToday();
setInterval(setupAlarmsForToday, 60 * 1000);

function setupAlarmsForToday() {
    const dayStart = new Date();
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayStart.setMilliseconds(0);

    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

    return gc.allEventsOfAllCalendars(new Date(), dayEnd)
        .then(items => {
            items.forEach(event => {
                // Use either the event time or 9AM (useful for whole day events)
                const eventTime = event.start.dateTime || dayStart.getTime() + 9 * 3600 * 1000;
                const eventDate = new Date(eventTime);

                if (eventDate.getTime() < new Date().getTime()) {
                    return;
                }

                alarm.addEvent(
                    event.id,
                    event.summary,
                    eventDate,
                    {'type': 'event', 'title': event.summary}
                );
            });

            broadcastNextAlarm();
        });
}

function splitStringIntoChunks(string, splitters) {
    if (string.length === 0) {
        return [];
    }

    if (string.length <= 200 || splitters.length === 0) {
        return [string];
    }

    const splitter = splitters[0];
    const components = string.split(splitter);
    if (components.length <= 1) {
        return splitStringIntoChunks(string, splitters.slice(1));
    }

    const firstComponent = components[0];

    const firstComponentChunks = splitStringIntoChunks(firstComponent, splitters.slice(1));
    const otherComponentsChunks = splitStringIntoChunks(string.slice(firstComponent.length + 1), splitters);

    return firstComponentChunks.concat(otherComponentsChunks);
}


function convertMessageSettings(message) {
    // Text message: go google translate
    if (typeof message === 'string') {
        return Promise.all(splitStringIntoChunks(message).map(chunk => {
            const fileName = uuid() + '.mp3';
            const filePath = '/tmp/pi-clock/' + fileName;
            const filePublicUrl = '/tmp/' + fileName;

            return googleTTS(chunk, 'en', 1)
                .then(url => rp({'uri': url, 'encoding': null}))

                // If Google TTS fails, fall back to espeak
                .catch(err => {
                    log.error('Google TTS failed', err);

                    return new Promise((resolve, reject) => {
                        espeak.speak(chunk, (err, wav) => {
                            if (err) {
                                return reject(err);
                            } else {
                                return resolve(wav.buffer);
                            }
                        });
                    });
                })

                // Save the audio file and return it along with the string
                .then(contents => {
                    // const filePath = __dirname + '/..' + file;

                    // Delete the file an hour later (assume it'll have been played by then)
                    // setTimeout(() => {
                    //     fs.remove(filePath, err => {
                    //         console.error('Error deleting file at ' + filePath, err);
                    //     });
                    // }, 60 * 3600);

                    return fs.outputFile(filePath, contents);
                })
                .then(() => {
                    return {
                        'url': filePublicUrl,
                        'message': chunk
                    };
                });
        }));
    }

    // Video message: send the video ID
    if (message.videoId) {
        return Promise.resolve([{
            'videoId': message.videoId,
            'interruptible': message.interruptible
        }]);
    }

    if (message.radioUrl) {
        return Promise.resolve([{
            'radioUrl': message.radioUrl
        }]);
    }

    if (message.pictureUrl) {
        return Promise.resolve([{
            'pictureUrl': message.pictureUrl
        }]);
    }

    return Promise.reject(new Error('Invalid message'));
}

function playMessages(messages, client) {
    Promise.all(messages.filter(m => m).map(message => convertMessageSettings(message)))
        .then(messagesChunks => {
            let flattened = [];
            messagesChunks.forEach(chunks => flattened = flattened.concat(chunks));
            return flattened;
        })
        .then(messagesSettings => {
            messagesSettings.forEach(settings => {
                client.emit('play-message', settings);
            });
        })
        .catch(err => log.error(err));
}

function broadcastNextAlarm() {
    const nextEvent = alarm.nextEvent;
    if (!nextEvent) {
        return;
    }

    clients.forEach(client => {
        client.emit('next-alarm', {'time': nextEvent.date.getTime()});
    });
}

function broadcastWeather() {
    weather.fetchForecast()
        .then(weather => {
            clients.forEach(client => client.emit('weather', weather));
        });
}

function generateScriptMessagesAndBroadcast(scripts) {
    Promise.all(scripts.map(script => {
        return script.generateMessages()
            .catch(err => {
                log.error(err);
                return ['Script error'];
            });
    })).then(results => {
        const messages = results.reduce((acc, messages) => acc.concat(messages), []);
        log.info(messages);

        clients.forEach(client => playMessages(messages, client));
    });
}
