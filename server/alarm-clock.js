'use strict';

const moment = require('moment');

class AlarmClock {

    constructor(log) {
        this.log = log;
        this.events = [];
        this.ringCallback = null;

        this.currentDate = () => new Date();
    }

    hasEvent(id) {
        return this.events.filter(settings => settings.id === id).length > 0;
    }

    addEvent(id, label, date, payload) {
        if (this.hasEvent(id)) {
            return;
        }

        this.log.info('Setting up for event "' + label + '" on ' + moment(date).format());

        this.events.push({
            'type': 'oneTime',
            'id': id,
            'label': label,
            'date': date,
            'payload': payload
        });
    }

    get nextEvent() {
        return this.events.reduce((minEvent, event) => {
            return !minEvent || event.date.getTime() < minEvent.date.getTime() ? event : minEvent;
        }, null);
    }

    tick() {
        // Find which events are in the past
        const events = this.events.filter((event) => {
            return event.date.getTime() < this.currentDate().getTime();
        });

        events.forEach((event) => {
            // Remove them
            this.events.splice(this.events.indexOf(event), 1);

            // Actually ring
            this.ring(event);
        });
    }

    ring(setting) {
        this.log.info('Ringing: ' + setting.label);

        if (this.ringCallback) {
            this.ringCallback(setting.payload);
        }
    }

}

module.exports = AlarmClock;
