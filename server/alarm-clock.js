'use strict';

class AlarmClock {

    constructor() {
        this.alarmSettings = [];
        this.ringCallback = null;

        this.currentDate = () => new Date();

        this.nextAlarm = null;
    }

    addRecurrentAlarm(dayOfWeek, millisecondsInDay) {
        this.alarmSettings.push({
            'type': 'recurrent',
            'dayOfWeek': dayOfWeek, 
            'millisecondsInDay': millisecondsInDay
        });
        this.sortAlarms();
    }

    addOneTimeAlarm(date) {
        this.alarmSettings.push({
            'type': 'oneTime',
            'date': date
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

        this.nextAlarm = this.nextAlarmTime();
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
        const previousNextAlarm = this.nextAlarm;
        this.sortAlarms();

        if (previousNextAlarm.getTime() === this.nextAlarm.getTime()) {
            return;
        }

        this.ring();
    }

    ring() {
        console.log('Ringing');

        if (this.ringCallback) {
            this.ringCallback();
        }
    }

}

module.exports = AlarmClock;
