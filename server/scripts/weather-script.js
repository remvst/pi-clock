'use strict';

const Script = require('./script');

class WeatherScript extends Script {

    constructor(weather) {
        super();
        this.weather = weather;
    }

    generateMessages() {
        return this.weather.fetchForecast()
            .then(forecast => {
                let maxTemperature = Number.MIN_SAFE_INTEGER;
                let minTemperature = Number.MAX_SAFE_INTEGER;

                const weatherTypes = new Set();

                forecast.list.slice(0, 4).forEach(chunk => {
                    maxTemperature = Math.max(maxTemperature, chunk.main.temp_max);
                    minTemperature = Math.min(minTemperature, chunk.main.temp_min);

                    weatherTypes.add(chunk.weather[0].description);
                });

                return [
                    'Here is the forecast for the day',
                    'Weather should be ' + Array.from(weatherTypes).join(', '),
                    'Temperatures should be between ' + this.toCelsius(minTemperature) + ' and ' + this.toCelsius(maxTemperature) + ' degrees celsius'
                ];
            });
    }

    toCelsius(kelvin) {
        return Math.round(kelvin - 273.15);
    }

}

module.exports = WeatherScript;