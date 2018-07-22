const MESSAGE_QUEUE = [];
let CURRENT_MESSAGE = null;
let NEXT_ALARM_TIME = null;
let YOUTUBE_PLAYER = null;
let STOP_VIDEO_CALLBACK = null;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June','July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MILLISECOND = 1;
const SECOND = 1000 * MILLISECOND;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function addZeroes(x, n = 2) {
    x = x.toString();
    while (x.length < n) {
        x = '0' + x;
    }
    return x;
}

function updateClocks() {
    const now = new Date();
    const s = addZeroes(now.getHours()) + ':' + addZeroes(now.getMinutes());

    document.querySelectorAll('.minutes').forEach(minutes => minutes.innerHTML = addZeroes(now.getMinutes()));
    document.querySelectorAll('.hours').forEach(hours => hours.innerHTML = addZeroes(now.getHours()));
    document.querySelectorAll('.column').forEach(column => column.style.visibility = now.getSeconds() % 2 ? 'visible' : 'hidden');

    document.querySelectorAll('.date').forEach(date => {
        date.innerHTML = DAYS[now.getDay()] + ', ' + MONTHS[now.getMonth()] + ' ' + now.getDate();
    });

    if (NEXT_ALARM_TIME) {
        const diff = NEXT_ALARM_TIME - now.getTime();

        const days = Math.floor(diff / DAY);
        const hours = Math.floor((diff - days * DAY) / HOUR);
        const minutes = Math.floor((diff - hours * HOUR - days * DAY) / MINUTE);
        const seconds = Math.floor((diff - minutes * MINUTE - hours * HOUR - days * DAY) / SECOND);

        document.querySelectorAll('.countdown').forEach(countdown => {
            countdown.innerHTML = 'Alarm in ' + days + 'd, ' + hours + 'h, ' + minutes + 'm, ' + seconds + 's';
        });
    }
}

function showSection(sectionId) {
    const section = document.querySelector('section#' + sectionId);
    if (!section) {
        return;
    }

    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
    });

    section.style.display = 'block';
}

function showMessage(messageData) {
    CURRENT_MESSAGE = messageData;

    if (messageData.message) {
        return showTextMessage(messageData);
    } else if (messageData.videoId) {
        return playVideo(messageData.videoId);
    }
}

function showTextMessage(messageData) {
    return new Promise((resolve, reject) => {
        document.querySelector('#message-text').innerHTML = messageData.message;

        const audio = new Audio();
        audio.addEventListener('canplay', () => {
            audio.play();
        }, false);
        audio.addEventListener('ended', err => {
            resolve();
        });
        audio.addEventListener('error', err => {
            reject(err);
        });
        audio.crossOrigin = 'anonymous';
        audio.src = messageData.url;

        showSection('message');
    });
}

function receivedMessage(messageData) {
    MESSAGE_QUEUE.push(messageData);
    playNextMessage();
}

function playNextMessage() {
    if (CURRENT_MESSAGE) {
        return;
    }

    const messageData = MESSAGE_QUEUE.shift();
    if (!messageData) {
        showSection('clock');
        return;
    }

    showMessage(messageData)
        .catch(err => console.error(err))
        .then(() => {
            CURRENT_MESSAGE = null;
            return playNextMessage();
        });
}

function receivedNextAlarm(alarmSettings) {
    NEXT_ALARM_TIME = alarmSettings.time;
}

function playVideo(videoId) {
    stopVideo();

    return new Promise((resolve, reject) => {
        STOP_VIDEO_CALLBACK = () => resolve();

        YOUTUBE_PLAYER = new YT.Player('video-container', {
            'width': '480',
            'height': '320',
            'videoId': videoId,
            'events': {
                'onReady': () => YOUTUBE_PLAYER.playVideo(),
                'onStateChange': event => {
                    const playerStatus = event.data;
                    if (playerStatus === 0) { // video ended
                        stopVideo();
                        resolve();
                    }
                },
                'onError': err => reject(err)
            }
        });
    
        showSection('video');
    });
}

function stopVideo() {
    if (!YOUTUBE_PLAYER) {
        return;
    }

    const callback = STOP_VIDEO_CALLBACK;

    YOUTUBE_PLAYER.destroy();
    YOUTUBE_PLAYER = null;
    STOP_VIDEO_CALLBACK = null;

    if (callback) {
        callback();
    }
}

function toCelsius(kelvin) {
    return kelvin - 273.15;
}

function receivedWeather(weather) {
    let maxTemperature = Number.MIN_SAFE_INTEGER;
    let minTemperature = Number.MAX_SAFE_INTEGER;

    const weatherTypeIds = new Set();

    weather.list.slice(0, 4).forEach(chunk => {
        maxTemperature = Math.max(maxTemperature, chunk.main.temp_max);
        minTemperature = Math.min(minTemperature, chunk.main.temp_min);

        weatherTypeIds.add(chunk.weather[0].icon);
    });

    document.querySelectorAll('.weather').forEach(node => {
        node.innerHTML = '';

        const temperatures = document.createElement('temperatures');
        temperatures.innerHTML = 'H: ' + Math.round(toCelsius(maxTemperature)) + '°, L: ' + Math.round(toCelsius(minTemperature)) + '°';
        node.appendChild(temperatures);
    
        weatherTypeIds.forEach(weatherTypeId => {
            const icon = new Image();
            icon.src = 'http://openweathermap.org/img/w/' + weatherTypeId + '.png';
            node.appendChild(icon);
        });
    });
}

// Start
window.addEventListener('load', () => {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    const socket = io();
    socket.on('play-message', messageData => receivedMessage(messageData));
    socket.on('next-alarm', messageData => receivedNextAlarm(messageData));
    socket.on('weather', weather => receivedWeather(weather));

    document.querySelector('#test-message-button').addEventListener('click', () => {
        socket.emit('test-message');
    });

    document.querySelector('#close-video-button').addEventListener('click', () => {
        stopVideo();
    });

    updateClocks();
    setInterval(() => updateClocks(), 500);
    showSection('clock');
}, false);
