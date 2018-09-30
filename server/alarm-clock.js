'use strict';

class AlarmClock {

    constructor() {
        this.alarmSettings = [];
        this.ringCallback = null;

        this.currentDate = () => new Date();

        this.nextAlarmTimes = null;
    }

    hasEvent(id) {
        return this.alarmSettings.filter(settings => settings.id === id).length > 0;
    }

    addRecurrentAlarm(label, dayOfWeek, millisecondsInDay, payload) {
        this.alarmSettings.push({
            'type': 'recurrent',
            'label': label,
            'dayOfWeek': dayOfWeek,
            'millisecondsInDay': millisecondsInDay,
            'payload': payload
        });
        this.sortAlarms();
    }

    addOneTimeAlarm(id, label, date, payload) {
        if (this.hasEvent(id)) {
            return;
        }

        this.alarmSettings.push({
            'type': 'oneTime',
            'id': id,
            'label': label,
            'date': date,
            'payload': payload
        });
        this.sortAlarms();
    }

    sortAlarms() {
        this.alarmSettings = this.alarmSettings.filter(setting => this.nextRingingTime(setting) !== null);

        this.alarmSettings.sort((a, b) => {
            const nextTimeA = this.nextRingingTime(a);
            const nextTimeB = this.nextRingingTime(b);

            return nextTimeA.getTime() - nextTimeB.getTime();
        });

        this.nextAlarmTimes = this.alarmSettings.map(setting => {
            return {
                'time': this.nextRingingTime(setting),
                'setting': setting
            };
        });
    }

    nextAlarmTime() {
        if (this.alarmSettings.length === 0) {
            return null;
        }

        return this.nextRingingTime(this.alarmSettings[0]);
    }

    nextRingingTime(setting) {
        if (setting.type === 'recurrent') {
            const now = this.currentDate();
            const currentDay = now.getDay();

            let dayDifference = setting.dayOfWeek - currentDay;
            while (dayDifference < 0 || dayDifference === 0 && this.millisecondsInDay(now) > setting.millisecondsInDay) {
                dayDifference += 7;
            }

            // Create a date at that day
            const date = new Date(this.currentDate().getTime() + dayDifference * 24 * 3600 * 1000);
            date.setHours(0, 0, 0, 0);
            date.setMilliseconds(setting.millisecondsInDay);

            return date;
        } else if (setting.type === 'oneTime') {
            return setting.date.getTime() < this.currentDate().getTime() ? null : setting.date;
        }
    }

    millisecondsInDay(date) {
        return (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) * 1000;
    }

    tick() {
        const previousNextAlarmTimes = this.nextAlarmTimes;
        this.sortAlarms();

        if (previousNextAlarmTimes[0].time.getTime() === this.nextAlarmTimes[0].time.getTime()) {
            return;
        }

        const now = Date.now();
        previousNextAlarmTimes
            .filter(alarmTime => now >= alarmTime.time.getTime())
            .forEach(alarmTime => this.ring(alarmTime.setting));
    }

    ring(setting) {
        console.log('Ringing: ' + setting.label);

        if (this.ringCallback) {
            this.ringCallback(setting.payload);
        }
    }

}

module.exports = AlarmClock;
