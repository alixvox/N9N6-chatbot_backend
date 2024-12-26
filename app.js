const express = require('express');
const bodyParser = require('body-parser');

const webhookRoutes = require('./src/routes/webhook');
const errorHandler = require('./src/utils/errorHandler');

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/webhook', webhookRoutes);

// Error handling
app.use(errorHandler);

module.exports = app;
