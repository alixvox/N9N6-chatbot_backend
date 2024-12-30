/**
 * Express application setup and configuration.
 * @module app
 */

const express = require("express");
const bodyParser = require("body-parser");
const webhookRoutes = require("./src/webhook");
const errorHandler = require("./src/utils/error");

const app = express();

app.use(bodyParser.json());
app.use("/webhook", webhookRoutes);
app.use(errorHandler);

module.exports = app;

