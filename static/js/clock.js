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
    document.querySelector('#message-text').innerHTML = messageData.message;

     // TODO do something with the audio file

     showSection('message');

     setTimeout(() => showSection('clock'), 2000);
}

// Start
window.addEventListener('load', () => {
    const socket = io();
    socket.on('play-message', messageData => showMessage(messageData));

    updateClocks();
    setInterval(() => updateClocks(), 1000);
    showSection('clock');
});
