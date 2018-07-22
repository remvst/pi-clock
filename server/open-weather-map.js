'use strict';

const rp = require('request-promise');

class OpenWeatherMap {

    constructor(options) {
        this.apiKey = options.apiKey;
        this.latitude = options.latitude;
        this.longitude = options.longitude;
    }

    fetchForecast() {
        const url = 'http://api.openweathermap.org/data/2.5/forecast?lat=' + this.latitude + '&lon=' + this.longitude + '&APPID=' + this.apiKey;
    
        return rp({
            'uri': url,
            'json': true
        });
    }

}

module.exports = OpenWeatherMap;