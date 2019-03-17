'use strict';

const moment = require('moment');

const Script = require('./script');

class GoogleCalendarScript extends Script {

    constructor(googleCalendar) {
        super();
        this.googleCalendar = googleCalendar;
    }

    generateMessages() {
        const dayStart = new Date();
        dayStart.setHours(0);
        dayStart.setMinutes(0);
        dayStart.setSeconds(0);
        dayStart.setMilliseconds(0);

        const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

        return this.allEventsOfAllCalendars(dayStart, dayEnd)
            .then(items => {
                const messages = [];

                messages.push('You have ' + items.length + ' events scheduled today');

                items.forEach(event => {
                    const eventName = event.summary;

                    let eventTime;
                    if (event.start.dateTime) {
                        eventTime = 'at ' + moment(event.start.dateTime).format('LT');
                    } else {
                        eventTime = 'the whole day';
                    }

                    messages.push(eventName + ', ' + eventTime);
                });

                return messages;
            });
    }

}

module.exports = GoogleCalendarScript;
