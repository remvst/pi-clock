'use strict';

class Clients {

    constructor(io, log) {
        this.io = io;
    }

    forEach(fn) {
        this.io.sockets.clients((err, clients) => {
            if (err) {
                log.error(err);
                return;
            }

            clients.forEach(socketId => {
                const client = this.io.sockets.connected[socketId];
                fn(client);
            });
        });
    }

}

module.exports = Clients;
