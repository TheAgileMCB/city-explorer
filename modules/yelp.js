'use strict';

const superagent = require('superagent');
const client = require('../utilities/db');
const errorHandler = require('./error');

function yelpHandler(request, response) {
  console.log(request.query);
  const lat = request.query.latitude;
  const lon = request.query.longitude;
  const yelpURL = 'https://api.yelp.com/v3/businesses/search';
  superagent.get(yelpURL)
    .set('Authorization', 'Bearer ' + process.env.YELP_KEY)
    .query({
      latitude: lat,
      longitude: lon
      // key: process.env.YELP_KEY
    })
    .then (yelpResponse => {

      let yelpData = yelpResponse.body;
      let businesses = yelpData.businesses.map(businessInfo => {
        return new Business(businessInfo);
      });
      response.send(businesses);
    })
    .catch(error => {
      console.log(error);
      errorHandler('Where all the people gone? No Yelp.', error);
    });
}

function Business(yelpData) {
  this.name = yelpData.name;
  this.image_url = yelpData.image_url;
  this.price = yelpData.price;
  this.rating = yelpData.rating;
  this.url = yelpData.url;
}

module.exports = yelpHandler;
