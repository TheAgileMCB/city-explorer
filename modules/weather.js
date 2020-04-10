'use strict';

const superagent = require('superagent');
const client = require('../utilities/db');
const errorHandler = require('./error');

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

function Weather(weatherData) {
  this.search_query = weatherData.city_name;
  this.forecast = weatherData.weather.description;
  this.time = new Date(weatherData.ts * 1000).toDateString();
}

module.exports = weatherHandler;
