'use strict';

const MESSAGE_QUEUE = [];
let CURRENT_MESSAGE = null;
let NEXT_ALARM_TIME = null;
let NEXT_MESSAGE_CALLBACK = null;

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
        document.querySelectorAll('.countdown-indicator').forEach(indicator => {
            indicator.style.height = (1 - diff / (3600 * 1000)) + '%';
        });
    }
}

function showSection(sectionId) {
    const section = document.querySelector('section#' + sectionId);
    if (!section) {
        return;
    }

    document.querySelectorAll('section').forEach(section => {
        section.className = 'hidden'
    });

    section.className = 'visible';
}

function sectionIsVisible(sectionId) {
    const section = document.querySelector('section#' + sectionId);
    if (!section) {
        return;
    }

    return section.style.display === 'block';
}

function receivedNextAlarm(alarmSettings) {
    NEXT_ALARM_TIME = alarmSettings.time;
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

    const messageController = new MessageController();

    // Socket input
    const socket = io();
    socket.on('connect', () => document.querySelector('#disconnected-banner').style.display = 'none');
    socket.on('disconnect', () => document.querySelector('#disconnected-banner').style.display = 'block');
    socket.on('play-message', messageData => messageController.addToQueue(messageData));
    socket.on('next-alarm', messageData => receivedNextAlarm(messageData));
    socket.on('weather', weather => receivedWeather(weather));

    // Controls
    document.querySelector('#test-message-button').addEventListener('click', () => {
        showSection('clock');
        socket.emit('test-message');
    });

    document.querySelector('#alarm').addEventListener('click', () => {
        showSection('clock');
        socket.emit('alarm');
    });

    document.querySelector('#sleep-radio').addEventListener('click', () => {
        showSection('clock');
        socket.emit('sleep-radio');
    });

    document.querySelector('#clock').addEventListener('click', () => {
        showSection('controls');

        setTimeout(() => {
            if (sectionIsVisible('controls')) {
                showSection('clock');
            }
        }, 8000);
    });

    document.querySelector('#close-controls').addEventListener('click', () => {
        showSection('clock');
    });

    document.querySelector('#close-video-button').addEventListener('mousedown', () => {
        messageController.skipMessage();
    });

    document.querySelector('#message').addEventListener('click', () => {
        messageController.skipMessage();
    });

    document.querySelector('#picture').addEventListener('click', () => {
        messageController.skipMessage();
    });

    updateClocks();
    setInterval(() => updateClocks(), 500);
    showSection('clock');
    socket.emit('hello');
}, false);
