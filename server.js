'use strict';

// Load Environment Variables from the .env file
const dotenv = require('dotenv');
dotenv.config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const PORT = process.env.PORT;
const app = express();

const client = require('./utilities/db');

const weatherHandler = require('./modules/weather');
const locationHandler = require('./modules/location');
const trailHandler = require('./modules/trails');

app.use(cors()); // Middleware

app.get('/', (request, response) => {
  response.send('City Explorer Goes Here');
});

app.get('/movies', (request, response) => {
  response.send([]);
});

app.get('/bad', () => {
  throw new Error('Sorry! Something went wrong.');
});

app.get('/weather', weatherHandler);
app.get('/location', locationHandler);
app.get('/trails', trailHandler);

// Has to happen after everything else
app.use(notFoundHandler);

client.connect()
  .then(() => {
    console.log('Database connected.');
    app.listen(PORT, () => console.log(`Listening on ${PORT}`));
  })
  .catch(error => {
    throw `Something went wrong: ${error}`;
  });

// Helper Functions
function notFoundHandler(request, response) {
  response.status(404).json({
    notFound: true,
  });
}
