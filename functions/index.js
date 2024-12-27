/**
 * Firebase Cloud Functions entry point.
 * Initializes Firebase Admin SDK and exports HTTP functions.
 * @module index
 */

const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import the Express app
const app = require("./app");

// Log initialization
logger.info("Initializing Firebase Functions", {structuredData: true});

/**
 * Main HTTP endpoint for the webhook API.
 * Handles all incoming requests through the Express application.
 */
exports.api = onRequest({
  cors: true,
  maxInstances: 10,
  invoker: "public", // Allow unauthenticated access
}, (request, response) => {
  logger.info("Received request", {
    path: request.path,
    method: request.method,
    structuredData: true,
  });

  return app(request, response);
});
