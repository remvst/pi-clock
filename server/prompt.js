'use strict';

function prompt(question) {
    const rl = readline.createInterface({
        'input': process.stdin,
        'output': process.stdout,
    });

    return new Promise(resolve => {
        rl.question(question, input => {
            rl.close();
            resolve(input);
        });
    });
}

module.exports = prompt;