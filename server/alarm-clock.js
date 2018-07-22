'use strict';

class AlarmClock {

    constructor() {
        this.alarmSettings = [];
        this.lastTick = new Date();
        this.ringCallback = null;
    }

    addRecurrentAlarm(dayOfWeek, millisecondsInDay) {
        this.alarmSettings.push({'dayOfWeek': dayOfWeek, 'millisecondsInDay': millisecondsInDay});
        this.sortAlarms();
    }

    sortAlarms() {
        this.alarmSettings.sort((a, b) => {
            const nextTimeA = this.nextRingingTime(a);
            const nextTimeB = this.nextRingingTime(b);

            return nextTimeA.getTime() - nextTimeB.getTime();
        });
    }

    nextAlarmTime() {
        if (this.alarmSettings.length === 0) {
            return null;
        }

        return this.nextRingingTime(this.alarmSettings[0]);
    }
    
    nextRingingTime(setting) {
        const now = new Date();
        const currentDay = now.getDay();

        let dayDifference = setting.dayOfWeek - currentDay;
        while (dayDifference < 0 || dayDifference === 0 && this.millisecondsInDay(now) > setting.millisecondsInDay) {
            dayDifference += 7;
        }

        // Create a date at that day
        const date = new Date(now.getTime() + dayDifference * 24 * 3600 * 1000);
        date.setHours(0, 0, 0, 0);
        date.setMilliseconds(setting.millisecondsInDay);

        return date;
    }

    millisecondsInDay(date) {
        return (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) * 1000;
    }
    
    tick() {
        const now = new Date();

        const nextAlarm = this.alarmSettings[0];
        const before = this.millisecondsInDay(this.lastTick) - nextAlarm.millisecondsInDay > 0;
        const after = this.millisecondsInDay(now) - nextAlarm.millisecondsInDay > 0;
                
        if (before === after) {
            return;
        }

        this.ring();

        this.lastTick = now;
    }

    ring() {
        this.sortAlarms();
        console.log('Ringing');

        if (this.ringCallback) {
            this.ringCallback();
        }
    }

}

module.exports = AlarmClock;