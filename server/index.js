'use strict';

const express = require('express');
const app = express();

const PORT = parseInt(process.env.PORT) || 5000;

app.use('/', express.static('static'));

app.listen(PORT, () => {
    console.log('Server started');
});