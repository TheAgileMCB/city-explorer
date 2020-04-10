'use strict';

const superagent = require('superagent');
const client = require('../utilities/db');


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

module.exports = trailHandler;
