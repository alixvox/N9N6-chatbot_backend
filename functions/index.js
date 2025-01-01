// functions/index.js
/**
 * @file Firebase Cloud Functions entry point.
 * Initializes Firebase Admin SDK and exports HTTP functions.
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {beforeAll} = require("firebase-functions/v2/tasks");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin SDK
admin.initializeApp();

const secretsManager = require("./src/utils/secrets-manager");
const documentManager = require("./src/utils/document-manager");
const cleanupManager = require("./src/utils/cleanup-manager");

// Import the Express app
const app = require("./app");

// Log initialization
logger.info("Initializing Firebase Functions", {structuredData: true});

/**
 * Sync documents with OpenAI vector store on deployment.
 */
exports.beforeAllTasks = beforeAll(async (event) => {
  try {
    await documentManager.syncDocuments();
    logger.info("Documents synced on deployment");
  } catch (error) {
    logger.error("Error syncing documents on deployment:", error);
    throw error;
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
}, async (request, response) => {
  try {
    // Get the webhook auth and attach it to the request
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
