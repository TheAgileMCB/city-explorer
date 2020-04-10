'use strict';

const express = require('express');
const app = express();

app.use(errorHandler); // Error Middleware

// Helper Functions
function errorHandler(error, request, response, next) {
  console.log(error);
  response.status(500).json({
    error: true,
    message: error.message,
  });
}

module.exports = errorHandler;
