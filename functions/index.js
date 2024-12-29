/**
 * Firebase Cloud Functions entry point.
 * Initializes Firebase Admin SDK and exports HTTP functions.
 * @module index
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const secretsManager = require("./src/utils/secrets-manager");

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
 * Scheduled Cloud Function that runs daily to clean up old chat sessions.
 * Deletes any session documents that have been inactive for more than an hour
 * from both N6 and N9 collections in Firestore.
 *
 * @function cleanupOldSessions
 * @type {CloudFunction<ScheduledEvent>}
 * @fires functions.pubsub.schedule
 * @fires admin.firestore.batch
 *
 * @param {Object} event - The scheduled event object
 * @param {string} event.timeZone - The timezone in which the function runs
 * @param {string} event.schedule - The cron schedule that triggers the function
 *
 * @throws {Error} Throws if batch deletion fails, triggering function retry
 */
exports.cleanupOldSessions = onSchedule({
  schedule: "0 0 * * *", // Run at midnight every day
  timeZone: "America/Chicago", // Adjust to your timezone
  retryCount: 3, // Retry up to 3 times if the function fails
}, async (event) => {
  const now = Date.now();
  const OLD_SESSION_THRESHOLD = 3600000; // 1 hour

  for (const stationId of ["n6", "n9"]) {
    const sessionsRef = admin.firestore().collection(`sessions_${stationId}`);

    try {
      // Query for old sessions
      const oldSessions = await sessionsRef
          .where("lastActivity", "<", now - OLD_SESSION_THRESHOLD)
          .get();

      if (oldSessions.empty) {
        logger.info(`No old sessions to clean up for ${stationId}`);
        continue;
      }

      // Delete old sessions in batches
      const batch = admin.firestore().batch();
      oldSessions.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Cleaned up ${oldSessions.size}` +
        `old sessions for ${stationId}`);
    } catch (error) {
      logger.error(`Error cleaning up sessions for ${stationId}:`, error);
      throw error; // This will trigger the retry mechanism
    }
  }
});
