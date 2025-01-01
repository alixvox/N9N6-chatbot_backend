// functions/src/functions/submission.js
/**
 * @file Handles all submission-related functions for the assistant
 * @module functions/submission
 */

const admin = require("firebase-admin");
const logger = require("../utils/logger");
const secretsManager = require("../utils/secrets-manager");
const {formatCurrentTimeCentral} = require("../utils/time-utils");

const db = admin.firestore();

/**
 * Gets the Firestore reference for a station's submissions collection
 * @param {string} stationId - Station identifier ('n6' or 'n9')
 * @return {FirebaseFirestore.CollectionReference} Firestore collection ref
 */
function getSubmissionsRef(stationId) {
  return db.collection(`submissions_${stationId}`);
}

/**
 * Handles submission-type functions (stories, feedback, etc)
 * @param {string} type - Type of submission
 * @param {Object} args - Function arguments from OpenAI
 * @param {string} sessionId - Session identifier
 * @param {string} userId - User identifier
 * @return {Promise<Object>} Success status
 */
async function handleSubmission(type, args, sessionId, userId) {
  try {
    const webhookUrl = await secretsManager.getSecret("ZAPIER_WEBHOOK");

    // Send to Zapier
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        ...args,
        stationId: args.stationId,
        time: formatCurrentTimeCentral("submission"),
      }),
    });

    if (!response.ok) {
      logger.error("Zapier webhook failed:", {
        status: response.status,
        type,
        sessionId,
      });
      return {success: false};
    }

    // Create submission document
    const submissionDoc = {
      type,
      content: args.description,
      zapierResponse: response.ok ? "Success" : "Failed",
      sessionId,
      userId,
      created: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    const docRef = await getSubmissionsRef(args.stationId).add(submissionDoc);

    // Log the submission
    logger.logSubmissionData({
      type,
      stationId: args.stationId,
      sessionId,
      content: args.description,
      zapierResponse: response.ok ? "Success" : "Failed",
      submissionId: docRef.id,
    });

    return {success: true};
  } catch (error) {
    logger.error("Error in handleSubmission:", {
      error: error.message,
      type,
      sessionId,
    });
    throw error;
  }
}

module.exports = {
  handleSubmission,
};
