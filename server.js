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
    });
    
}

// Add /location route
app.get('/location', locationHandler);

// const locatiionCache = {

// };

function getLocationFromCache(city) {
  const SQL = `SELECT * FROM locations WHERE search_query = $1;`;
  let values = [city]
  return client.query(SQL, values)
    .then(results => {
      return results;
    })
    .catch(error => {
      console.log(error);
      errorHandler(error, request, response);
    });
}

function setLocationInCache(city, location) {
  let setSQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *;`;
  // let {search_query, formatted_query, latitude, longitude} = location
  let values = [location.search_query, location.formatted_query, location.latitude, location.longitude];
  console.log('location cache updated', locationCache);
  return client.query(setSQL, values)
  .then (results => {
    console.log(results)
    return results;
  })
  .catch(error => {
    console.log(error);
  });
};

// Route Handler
async function locationHandler(request, response) {
  const city = request.query.city;
  const locationFromCache = await getLocationFromCache(city);
  console.log(locationFromCache);
  if (locationFromCache.rowCount) {
    response.send(locationFromCache.rows);
    return;
  }
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
      setLocationInCache(city, location);
      response.send(city, location);
    })
    .catch(error => {
      console.log(error);
      errorHandler(error, request, response);
    });
}

app.get('/trails', trailHandler);

function trailHandler(request, response) {
  console.log(request);
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
        console.log(trailData);
        return new Trail(trailStats);
      });
      response.send(availableTrails);
    });
    
}


// Has to happen after everything else
app.use(notFoundHandler);
// Has to happen after the error might have occurred
app.use(errorHandler); // Error Middleware

// Make sure the server is listening for requests
// app.listen(PORT, () => console.log(`App is listening on ${PORT}`));

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