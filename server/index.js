'use strict';

const express = require('express');
const Server = require('http').Server;
const socketIO = require('socket.io');
const googleTTS = require('google-tts-api');
const rp = require('request-promise');
const fs = require('fs-extra');
const uuid = require('uuid4');
const NodeWebcam = require('node-webcam');
const moment = require('moment');
const { exec } = require('child_process');
const espeak = require('espeak');
const bunyan = require('bunyan');

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

const log = bunyan.createLogger({'name': 'pi-clock'});

const clients = new Clients(io, log);

app.use('/tmp', express.static('tmp'));
app.use('/frames', express.static('frames'));
app.use('/', express.static('static'));

server.listen(PORT, () => {
    log.info('Server started on port ' + PORT);

    setInterval(() => alarm.tick(), 1000);
    setInterval(broadcastWeather, 30000);
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

// Scripts
const randomVideoScript = new RandomVideoScript(config.VIDEO_IDS);

const wakeUpScripts = [
    new RandomVideoScript(config.ALARM_VIDEO_IDS, true)
];

const alarmScripts = [
    new StaticScript(['Good morning Remi', 'Time to wake up']),
    new TimeScript(),
    new GoogleCalendarScript(gc),
    new WeatherScript(weather),
    new NewsScript(news),
    new QuoteOfTheDayScript(quote),
    randomVideoScript,
    randomVideoScript,
    randomVideoScript,
    new StaticScript(['Have an amazing day'])
];

// Alarm
const alarm = new AlarmClock(log);

alarm.addRecurrentAlarm('Sunday wake up', 0, 10 * 3600 * 1000 - 20 * 60 * 1000, {'type': 'wakeup'});
alarm.addRecurrentAlarm('Monday wake up', 1, 8.5 * 3600 * 1000 - 20 * 60 * 1000, {'type': 'wakeup'});
alarm.addRecurrentAlarm('Tuesday wake up', 2, 8.5 * 3600 * 1000 - 20 * 60 * 1000, {'type': 'wakeup'});
alarm.addRecurrentAlarm('Wednesday wake up', 3, 8.5 * 3600 * 1000 - 20 * 60 * 1000, {'type': 'wakeup'});
alarm.addRecurrentAlarm('Thursday wake up', 4, 8.5 * 3600 * 1000 - 20 * 60 * 1000, {'type': 'wakeup'});
alarm.addRecurrentAlarm('Friday wake up', 5, 8.5 * 3600 * 1000 - 20 * 60 * 1000, {'type': 'wakeup'});
alarm.addRecurrentAlarm('Saturday wake up', 6, 10 * 3600 * 1000 - 20 * 60 * 1000, {'type': 'wakeup'});

alarm.addRecurrentAlarm('Sunday morning', 0, 10 * 3600 * 1000, {'type': 'alarm'});
alarm.addRecurrentAlarm('Monday morning', 1, 8.5 * 3600 * 1000, {'type': 'alarm'});
alarm.addRecurrentAlarm('Tuesday morning', 2, 8.5 * 3600 * 1000, {'type': 'alarm'});
alarm.addRecurrentAlarm('Wednesday morning', 3, 8.5 * 3600 * 1000, {'type': 'alarm'});
alarm.addRecurrentAlarm('Thursday morning', 4, 8.5 * 3600 * 1000, {'type': 'alarm'});
alarm.addRecurrentAlarm('Friday morning', 5, 8.5 * 3600 * 1000, {'type': 'alarm'});
alarm.addRecurrentAlarm('Saturday morning', 6, 10 * 3600 * 1000, {'type': 'alarm'});

// alarm.addRecurrentAlarm('now', new Date().getDay(), alarm.millisecondsInDay(new Date()) + 5000, {'type': 'wakeup'});
// alarm.addRecurrentAlarm('now again', new Date().getDay(), alarm.millisecondsInDay(new Date()) + 10000, {'type': 'alarm'});
// alarm.addOneTimeAlarm('testing', new Date(Date.now() + 5000), {'foo': 'bar'});

alarm.ringCallback = event => {
    if (event.type === 'wakeup') {
        generateScriptMessagesAndBroadcast(wakeUpScripts);
        broadcastNextAlarm();
    } else if (event.type === 'alarm' || (event.title || '').indexOf('wake') >= 0) {
        generateScriptMessagesAndBroadcast(alarmScripts);
        broadcastNextAlarm();
    } else if (event.type === 'event') {
        clients.forEach(client => {
            playMessages(['Event starting now', event.title], client);

            if ((event.title || '').toLowerCase().indexOf('video') >= 0) {
                randomVideoScript.generateMessages().then(messages => playMessages(messages, client));
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

    client.on('timelapse', settings => {
        const duration = settings.duration || 10 * 60;
        const framerate = settings.framerate || 10 / 60;

        playMessages(['Starting timelapse for ' + Math.round(duration / 60) + ' minutes at ' + (Math.round(framerate * 100) / 100) + ' FPS'], client);

        makeTimelapse(duration, framerate, client)
            .then(() => playMessages(['Timelapse is ready'], client));
    });

    client.on('hello', () => {
        playMessages(['PI clock connected'], client);
    });

    client.on('alarm', () => {
        playMessages(['Triggering alarm messages...'], client);
        alarm.ringCallback({'type': 'alarm'});
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
                // Use either the event time or 9AM
                const eventTime = event.start.dateTime || dayStart.getTime() + 9 * 3600 * 1000;
                const eventDate = new Date(eventTime);

                if (eventDate.getTime() < new Date().getTime()) {
                    return;
                }

                if (alarm.hasEvent(event.id)) {
                    return;
                }

                log.info('Setting up alarm for event "' + event.summary + '" on ' + moment(eventDate).format());
                alarm.addOneTimeAlarm(event.id, 'Event: ' + event.summary, eventDate, {'type': 'event', 'title': event.summary});
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
            const file = '/tmp/' + uuid() + '.mp3';
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
                    const filePath = __dirname + '/..' + file;

                    // Delete the file an hour later (assume it'll have been played by then)
                    setTimeout(() => {
                        fs.remove(filePath, err => {
                            console.error('Error deleting file at ' + filePath, err);
                        });
                    }, 60 * 3600);

                    return fs.outputFile(filePath, contents);
                })
                .then(() => {
                    return {
                        'url': file,
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
    const nextAlarm = alarm.nextAlarmTime();
    if (!nextAlarm) {
        return;
    }

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

function takePicture(path, delayInMs) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const camera = NodeWebcam.create({
                width: 1280,
                height: 720,
                quality: 100,
                delay: 0,
                saveShots: false,
                skip: 40,
                output: 'jpeg',
                callbackReturn: 'location',
                verbose: true
            });

            camera.capture(path, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(path);
                }
            });
        }, delayInMs);
    });
}

function makeTimelapse(duration, fps, client) {
    const frames = duration * fps;
    const maxFrameIdLength = Math.max(frames.toString().length, 4);
    const dateFormat = moment(new Date()).utc().format();
    const folder = 'frames/' + dateFormat;

    return fs.mkdirp(folder)
        .then(() => {
            const promises = [];
            for (let i = 0 ; i < frames ; i++) {
                const file = folder + '/frame-' + addZeroes(i, maxFrameIdLength);
                const delayInMs = i * (1 / fps) * 1000;
                promises.push(takePicture(file, delayInMs));
            }

            return Promise.all(promises.map(promise => {
                return promise
                    .then(path => playMessages([{'pictureUrl': path + '.jpg'}], client))
                    .catch(err => log.error(err));
            }));
        })
        .then(() => {
            log.info('Assembling frames');
            playMessages(['Frames are ready, assembling...'], client);

            const videoPath = 'video.mp4';
            return new Promise((resolve, reject) => {
                const command = 'ffmpeg -r 25 -i ' + folder + '/frame-*.jpg -c:v libx264 -vf fps=25 -pix_fmt yuv420p ' + folder + '/' + dateFormat + '.mp4';
                log.debug(command);
                exec(command, err => {
                    if (err) {
                        log.error(err);
                        reject(err);
                        return;
                    }

                    log.info('Frames assembled');
                    resolve(videoPath);
                });
            });
        });
}

function addZeroes(x, n = 2) {
    x = x.toString();
    while (x.length < n) {
        x = '0' + x;
    }
    return x;
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
