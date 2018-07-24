'use strict';

module.exports = (x, length = 2) => {
    x = x.toString();
    while (x.length < length) {
        x = '0' + x;
    }
    return x;
};