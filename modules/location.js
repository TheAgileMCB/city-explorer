'use strict';

const superagent = require('superagent');
const client = require('../utilities/db');

// Add /location route

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

      setLocationInCache(location)
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

function Location(city, geoData) {
  this.search_query = city; // "cedar rapids"
  this.formatted_query = geoData[0].display_name; // "Cedar Rapids, Iowa"
  this.latitude = parseFloat(geoData[0].lat);
  this.longitude = parseFloat(geoData[0].lon);
}

module.exports = locationHandler;
