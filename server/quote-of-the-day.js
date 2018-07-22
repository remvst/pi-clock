'use strict';

const rp = require('request-promise');

class QuoteOfTheDay {

    fetchQuote() {
        return rp({
            'uri': 'https://quotes.rest/qod',
            'json': true
        });
    }

}

module.exports = QuoteOfTheDay;