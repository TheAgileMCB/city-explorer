'use strict';

// Load Environment Variables from the .env file
const dotenv = require('dotenv')
dotenv.config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

// Application Setup
const PORT = process.env.PORT;
const app = express();

app.use(cors()); // Middleware

app.get('/', (request, response) => {
  response.send('City Explorer Goes Here');
  // response.send(express.static('public'));
});

app.get('/bad', () => {
  throw new Error('oops');
});

app.get('/weather', weatherHandler);

function weatherHandler (request, response) {
  const weatherData = require('./data/darksky.json');
  // TODO: pull lat/lon out of request.query
  console.log(request.query);
  const weatherResults = [];
  weatherData.daily.data.forEach(dailyWeather => {
    weatherResults.push (new Weather(dailyWeather));
  });
  response.send(weatherResults);

}

// Add /location route
app.get('/location', locationHandler);

// Route Handler
function locationHandler(request, response) {
  const geoData = require('./data/geo.json');
  const city = request.query.city;
  const location = new Location(city, geoData);
  response.send(location);
}

app.get('/location', locationHandler);

// Route Handler
// function locationHandler(request, response) {
//   const city = request.query.city;

//   const url = 'https://us1.locationiq.com/v1/search.php';
//   superagent.get(url)
//     .query({
//       key: process.env.GEO_KEY,
//       q: city,
//       format: 'json'
//     })
//     .then(locationResponse => {
//       let geoData = locationResponse.body;
//       console.log(geoData);
//       const location = new Location(city, geoData);
//       response.send(location);
//     });

// }

// Has to happen after everything else
app.use(notFoundHandler);
// Has to happen after the error might have occurred
app.use(errorHandler); // Error Middleware

// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`App is listening on ${PORT}`));

// Helper Functions

function errorHandler(error, request, response, next) {
  console.log(error);
  response.status(500).json({
    error: true,
    message: error.message,
  });
}

function notFoundHandler(request, response) {
  response.status(404).json({
    notFound: true,
  });
}

function Weather(weatherData) {
  this.forecast = weatherData.summary;
  this.time = new Date(weatherData.time * 1000);
}

function Location(city, geoData) {
  this.search_query = city; // "cedar rapids"
  this.formatted_query = geoData[0].display_name; // "Cedar Rapids, Iowa"
  this.latitude = parseFloat(geoData[0].lat);
  this.longitude = parseFloat(geoData[0].lon);
}
