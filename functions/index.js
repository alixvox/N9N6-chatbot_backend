/**
 * Firebase Cloud Functions entry point.
 * Initializes Firebase Admin SDK and exports HTTP functions.
 * @module index
 */

const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {SecretManagerServiceClient} = require("@google-cloud/secret-manager");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Secret Manager client
const secretClient = new SecretManagerServiceClient();

// Import the Express app
const app = require("./app");

// Log initialization
logger.info("Initializing Firebase Functions", {structuredData: true});

/**
 * Retrieves the latest version of a secret
 * @param {string} secretName - Name of the secret to retrieve
 * @return {Promise<string>} The secret value
 */
async function getSecret(secretName) {
  try {
    const secretPath = [
      "projects",
      "n9n6-chatbot-backend",
      "secrets",
      secretName,
      "versions",
      "latest",
    ].join("/");

    const response = await secretClient.accessSecretVersion({
      name: secretPath,
    });
    const [version] = response;

    return version.payload.data.toString("utf8");
  } catch (error) {
    logger.error(`Error accessing secret ${secretName}:`, error);
    throw error;
  }
}

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
    // Get the webhook secret and attach it to the request
    request.webhookSecret = await getSecret("WEBHOOK_SECRET");

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
