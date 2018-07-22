'use strict';

const Script = require('./script');

class QuoteOfTheDayScript extends Script {

    constructor(quoteOfTheDay) {
        super();
        this.quoteOfTheDay = quoteOfTheDay;
    }

    generateMessages() {
        return this.quoteOfTheDay.fetchQuote()
            .then(data => {
                return [
                    'Quote of the day by ' + data.contents.quotes[0].author,
                    data.contents.quotes[0].quote
                ];
            });
    }

}

module.exports = QuoteOfTheDayScript;