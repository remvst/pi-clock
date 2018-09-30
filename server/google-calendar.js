'use strict';

const {google} = require('googleapis');
const readline = require('readline');
const fs = require('fs-extra');

const prompt = require('./prompt');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

class GoogleCalendar {

    constructor(options) {
        this.log = options.log;
        this.credentialsPath = options.credentialsPath;
        this.tokenPath = options.tokenPath;

        this.client = null;
    }

    authorize() {
        return fs.readFile(this.credentialsPath)
            .then(content => this.getToken(JSON.parse(content)));
    }

    getToken(credentials) {
        const {client_secret, client_id, redirect_uris} = credentials.installed;
        this.client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // Check if we have previously stored a token
        return fs.readFile(this.tokenPath)
            .catch(() => {
                this.log.warn('Error reading ' + this.tokenPath + ', generating new token');
                return this.getNewAccessToken();
            })
            .then(token => this.client.setCredentials(JSON.parse(token)));
    }

    getNewAccessToken() {
        const authUrl = this.client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        this.log.info('Authorize this app by visiting this url:', authUrl);

        // Prompt the token
        const rl = readline.createInterface({
            'input': process.stdin,
            'output': process.stdout,
        });

        return prompt('Enter the code from that page here: ')
            .then(code => this.getTokenFromCode(code))
            .then(token => fs.writeFile(this.tokenPath, JSON.stringify(token)).then(() => token));
    }

    getTokenFromCode(code) {
        return new Promise((resolve, reject) => {
            this.client.getToken(code, (err, token) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(token);
            });
        });
    }

    events(minDate, maxDate, calendarId = 'primary') {
        return this.authorize()
            .then(() => this.doFetchEvents(minDate, maxDate, calendarId));
    }

    doFetchEvents(minDate, maxDate, calendarId) {
        return new Promise((resolve, reject) => {
            const calendar = google.calendar({'version': 'v3', 'auth': this.client});
            calendar.events.list({
                'calendarId': encodeURIComponent(calendarId),
                'timeMin': minDate ? minDate.toISOString() : null,
                'timeMax': maxDate ? maxDate.toISOString() : null,
                'maxResults': 10,
                'singleEvents': true,
                'orderBy': 'startTime',
            }, (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(res.data.items);
            });
        });
    }

    calendars() {
        return this.authorize()
            .then(() => this.doFetchCalendars());
    }

    doFetchCalendars() {
        return new Promise((resolve, reject) => {
            const calendar = google.calendar({'version': 'v3', 'auth': this.client});
            calendar.calendarList.list({}, (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(res.data.items);
            });
        });
    }

    allEventsOfAllCalendars(minDate, maxDate) {
        return this.calendars()
            .then(calendars => {
                return Promise.all(calendars.map(calendar => {
                    return this.events(minDate, maxDate, calendar.id);
                }));
            })
            .then(eventsByCalendar => {
                // Flatten everything
                return eventsByCalendar.reduce((acc, events) => {
                    return acc.concat(events);
                }, []);
            });
    }

}

module.exports = GoogleCalendar;
