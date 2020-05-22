'use strict';

const readline = require('readline');

module.exports = function prompt(question) {
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
};
