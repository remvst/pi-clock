'use strict';

const rp = require('request-promise');

class News {

    constructor(options) {
        this.apiKey = options.apiKey;
        this.sortBy = options.sortBy || 'top';
        this.source = options.source;
    }

    fetchNews() {
        const url = 'https://newsapi.org/v1/articles?source=' + this.source + '&sortBy=' + this.sortBy + '&apiKey=' + this.apiKey;
    
        return rp({
            'uri': url,
            'json': true
        });
    }

}

module.exports = News;