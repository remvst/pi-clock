const MESSAGE_QUEUE = [];
let CURRENT_MESSAGE = null;

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

    document.querySelectorAll('.clock').forEach(clock => {
        clock.innerHTML = s;
    });
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
    return new Promise((resolve, reject) => {
        CURRENT_MESSAGE = messageData;

        document.querySelector('#message-text').innerHTML = messageData.message;

        const audio = new Audio();
        audio.addEventListener('canplay', () => {
            audio.play();
        }, false);
        audio.addEventListener('ended', err => {
            CURRENT_MESSAGE = null;
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
        .then(playNextMessage, playNextMessage);
}

// Start
window.addEventListener('load', () => {
    const socket = io();
    socket.on('play-message', messageData => receivedMessage(messageData));

    document.querySelector('#test-message-button').addEventListener('click', () => {
       socket.emit('test-message');
    });

    updateClocks();
    setInterval(() => updateClocks(), 1000);
    showSection('clock');
}, false);
