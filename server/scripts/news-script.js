'use strict';

const Script = require('./script');

class NewsScript extends Script {

    constructor(news) {
        super();
        this.news = news;
    }

    generateMessages() {
        return this.news.fetchNews()
            .then(data => {
                const messages = [
                    'Here are the headlines from ' + this.news.source,
                ];

                data.articles.slice(0, 5).forEach(article => {
                    messages.push(article.title);
                });

                return messages;
            });
    }

}

module.exports = NewsScript;