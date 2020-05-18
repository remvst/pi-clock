'use strict';

const rp = require('request-promise');

class Youtube {

    constructor(options) {
        this.log = options.log;
        this.apiKey = options.apiKey;

        this.client = null;
    }

    videosInPlaylist(playlistId) {
        const requestPage = (pageToken, items) => {
            let uri = 'https://www.googleapis.com/youtube/v3/playlistItems';
            uri += '?part=contentDetails';
            uri += `&key=${this.apiKey}`;
            uri += `&playlistId=${playlistId}`;
            uri += `&maxResults=50`;

            if (pageToken) {
                uri += `&pageToken=${pageToken}`;
            }

            return rp({
                'uri': uri,
                'json': true
            }).then((result) => {
                const newItems = items.concat(result.items);

                if (result.nextPageToken) {
                    return requestPage(result.nextPageToken, newItems);
                } else {
                    return newItems;
                }
            });
        }

        return requestPage(null, []);
    }

}

module.exports = Youtube;
