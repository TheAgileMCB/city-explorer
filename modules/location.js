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

