'use strict';

// Load Environment Variables from the .env file
const dotenv = require('dotenv');
dotenv.config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

// Database connection setup
if (!process.env.DATABASE_URL) {
  throw 'Missing DATABASE_URL';
}

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => { throw err; });

// Application Setup
const PORT = process.env.PORT;
const app = express();

app.use(cors()); // Middleware

app.get('/', (request, response) => {
  response.send('City Explorer Goes Here');
});

app.get('/bad', () => {
  throw new Error('Sorry! Something went wrong.');
});

app.get('/weather', weatherHandler);

function weatherHandler(request, response) {
  const weatherCity = request.query.search_query;
  const weatherURL = 'http://api.weatherbit.io/v2.0/forecast/daily';
  superagent.get(weatherURL)
    .query({
      city: weatherCity,
      key: process.env.WEATHER_KEY
    })
    .then(weatherResponse => {
      let weatherData = weatherResponse.body;
      let dailyForecast = weatherData.data.map(dailyWeather => {
        return new Weather(dailyWeather);
      });
      response.send(dailyForecast);
    })
    .catch(error => {
      console.log(error);
      errorHandler('No windows. Cannot see the weather', error);
    });
}

// Add /location route
app.get('/location', locationHandler);

function getLocationFromCache(city) {
  const SQL = `
  SELECT *
  FROM Locations
  WHERE search_query = $1
  LIMIT 1
  `;
  const parameters = [city];

  return client.query(SQL, parameters);
}

function setLocationInCache(location) {
  const { search_query, formatted_query, latitude, longitude } = location;
  const SQL = `
  INSERT INTO Locations (search_query, formatted_query, latitude, longitude)
  VALUES ($1, $2, $3, $4)
  -- RETURNING *
  `;
  const parameters = [search_query, formatted_query, latitude, longitude];

  // returns a promise!
  return client.query(SQL, parameters)
    .then(result => {
      console.log('Cache Location', result);
    })
    .catch(err => {
      console.error('Failed to cache location', err);
    });
}

// Route Handler
function locationHandler(request, response) {
  const city = request.query.city;
  getLocationFromCache(city, response)
    .then(result => {
      let {rowCount, rows} = result;
      if (rowCount > 0) {
        response.send(rows[0]);
      } else {
        return getLocationFromApi(city, response);
      }
    });
}

function getLocationFromApi(city, response) {
  const url = 'https://us1.locationiq.com/v1/search.php';
  superagent.get(url)
    .query({
      key: process.env.GEO_KEY,
      q: city,
      format: 'json'
    })
    .then(locationResponse => {
      let geoData = locationResponse.body;

      const location = new Location(city, geoData);

      setLocationInCache(location, response)
        .then(() => {
          console.log('Data cached!');
          response.send(location);
        });
    })
    .catch(error => {
      console.log(error);
      errorHandler('Failed to get location from Cache', error);
    });
}


app.get('/trails', trailHandler);

function trailHandler(request, response) {
  const trailURL = 'https://www.hikingproject.com/data/get-trails';
  superagent.get(trailURL)
    .query({
      key: process.env.TRAIL_KEY,
      lat: request.query.latitude,
      lon: request.query.longitude
    })
    .then(trailResponse => {
      let trailData = trailResponse.body;
      let availableTrails = trailData.trails.map(trailStats => {
        return new Trail(trailStats);
      });
      response.send(availableTrails);
    })
    .catch(error => {
      console.log(error);
      errorHandler('Could not access trails', error);
    });
}


// Has to happen after everything else
app.use(notFoundHandler);
// Has to happen after the error might have occurred
app.use(errorHandler); // Error Middleware

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
  this.search_query = weatherData.city_name;
  this.forecast = weatherData.weather.description;
  this.time = new Date(weatherData.ts * 1000).toDateString();
}

function Location(city, geoData) {
  this.search_query = city; // "cedar rapids"
  this.formatted_query = geoData[0].display_name; // "Cedar Rapids, Iowa"
  this.latitude = parseFloat(geoData[0].lat);
  this.longitude = parseFloat(geoData[0].lon);
}

function Trail(trailData) {
  this.name = trailData.name;
  this.location = trailData.location;
  this.length = trailData.length;
  this.stars = trailData.stars;
  this.star_votes = trailData.starVotes;
  this.summary = trailData.summary;
  this.trail_url = trailData.url;
  this.conditions = trailData.conditionDetails;
  this.condition_date = new Date(trailData.conditionDate).toDateString();
}

client.connect()
  .then(() => {
    console.log('Database connected.');
    app.listen(PORT, () => console.log(`Listening on ${PORT}`));
  })
  .catch(error => {
    throw `Something went wrong: ${error}`;
  });

// function Yelp

// function Movie