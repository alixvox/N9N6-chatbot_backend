// functions/index.js
/**
 * @file Firebase Cloud Functions entry point.
 * Initializes Firebase Admin SDK and exports HTTP functions.
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onInit} = require("firebase-functions/v1");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin SDK first
admin.initializeApp();

// Then require modules that depend on Firebase Admin
const secretsManager = require("./src/managers/secrets");
const cleanupManager = require("./src/managers/cleanup");
const vectorStoreManager = require("./src/managers/vector-store");

// Import the Express app
const app = require("./app");

// Log initialization
logger.info("Initializing Firebase Functions", {structuredData: true});

// Initialize vector store optimization
onInit(async () => {
  try {
    logger.info("Starting vector store optimization");
    await vectorStoreManager.optimizeVectorStore();
    logger.info("Vector store optimization completed");
  } catch (error) {
    logger.error("Error during vector store optimization:", error);
    // Don't throw error to allow functions to start
  }
});

/**
 * Main HTTP endpoint for the webhook API.
 * Handles all incoming requests through the Express application.
 */
exports.api = onRequest({
  cors: true,
  maxInstances: 10,
  invoker: "public",
  timeoutSeconds: 540,
}, async (request, response) => {
  try {
    request.auth = await secretsManager.getSecret("WATSONX_AUTH");

    logger.info("Received request", {
      path: request.path,
      method: request.method,
      structuredData: true,
    });

    return app(request, response);
  } catch (error) {
    logger.error("Error processing request:", error);
    return response.status(500).json({error: "Internal server error"});
  }
});

/**
 * Weekly cleanup of sessions and submissions
 * Runs at midnight between Tuesday and Wednesday
 */
exports.weeklyCleanup = onSchedule({
  schedule: "0 0 * * 3",
  timeZone: "America/Chicago",
  retryCount: 3,
}, async (event) => {
  try {
    await cleanupManager.cleanupStations();
    logger.info("Weekly cleanup completed");
  } catch (error) {
    logger.error("Error in weekly cleanup:", error);
    throw error;
  }
});
