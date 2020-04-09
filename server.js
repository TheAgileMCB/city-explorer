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
  // response.send(express.static('public'));
});

app.get('/bad', () => {
  throw new Error('Sorry! Something went wrong.');
});

app.get('/weather', weatherHandler);

// function weatherHandler (request, response) {
//   const weatherData = require('./data/darksky.json');
//   // TODO: pull lat/lon out of request.query
//   console.log(request.query);
//   const weatherResults = [];
//   weatherData.daily.data.forEach(dailyWeather => {
//     weatherResults.push (new Weather(dailyWeather));
//   });
//   response.send(weatherResults);

// }

function weatherHandler(request, response) {
  const weatherCity = request.query.search_query;
  const weatherURL = 'http://api.weatherbit.io/v2.0/forecast/daily';
  superagent.get(weatherURL)
    .query({
      city: weatherCity,
      key: process.env.WEATHER_KEY,
      
    })
    .then(weatherResponse => {
      let weatherData = weatherResponse.body;
      let dailyWeatherResults = weatherData.data.map(dailyWeather => {
        return new Weather(dailyWeather);
      });
      response.send(dailyWeatherResults);
    });

}

// Add /location route
app.get('/location', locationHandler);

const locationCache = {
  //"cedar rapids, ia": {display_name: 'Cedar Rapids', lat: 5, lon: 1}
};

function getLocationFromCache(city) {
  const cacheEntry = locationCache[city];
  if (cacheEntry) {
    // if (cacheEntry.cacheTime < Date.now() - 5000) {
    //   delete locationCache[city];
    //   return null;
    // }
    return cacheEntry.location;
  }
  return null;
}

function setLocationInCache(city, location) {
  locationCache[city] = {
    CacheTime: new Date(),
    location,
  };
  console.log(locationCache);
}

// Route Handler
function locationHandler(request, response) {
  const city = request.query.city;

  const locationFromCache = getLocationFromCache(city);
  if (locationFromCache) {
    response.send(locationFromCache);
    return; //or use else below
  }

  const url = 'https://us1.locationiq.com/v1/search.php';
  superagent.get(url)
    .query({
      key: process.env.GEO_KEY,
      q: city,
      lat: request.query.lat,
      lon: request.query.lon,
      format: 'json'
    })
    .then(locationResponse => {
      let geoData = locationResponse.body;
      console.log(geoData);
      const location = new Location(city, geoData);
      setLocationInCache(city, location);
      response.send(location);
    })
    .catch(error => {
      console.log(error);
      errorHandler(error, request, response);
    });
}

// app.get('/books', (request, response) => {
//   const SQL = 'SELECT * FROM Books';
//   client.query(SQL)
//     .then(results => {
//       let { rowCount, rows } = results;

//       if (rowCount === 0) {
//         response.send({
//           error: true,
//           message: 'Read more, dummy'
//         });
//       } else {
//         response.send({
//           error: false,
//           results: rows,
//         });
//       }

//       // console.log(results);

//       // response.json(results.rows);
//     })
//     .catch(err => {
//       console.log(err);
//       errorHandler(err, request, response);
//     });
// });

// Has to happen after everything else
app.use(notFoundHandler);
// Has to happen after the error might have occurred
app.use(errorHandler); // Error Middleware

client.connect()
  .then(() => {
    console.log('PG connected!');

    // Make sure the server is listening for requests
    app.listen(PORT, () => console.log(`App is listening on ${PORT}`));
  })
  .catch(err => {
    throw `PG error!: ${err.message}`;
  });

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

// const key = process.env.KEY;
// const lat = request.query.lat;
// const lon = request.query.lon;

// .query({key, lat, lon})
// .then(...)
