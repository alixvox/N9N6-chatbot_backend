/**
 * Handles execution of functions called by OpenAI Assistant
 * @module function-manager
 */

const admin = require("firebase-admin");
const logger = require("./logger");
const secretsManager = require("./secrets-manager");

const db = admin.firestore();

/**
 * Formats current time to Central Time
 * @return {string} Formatted time string
 */
function formatCurrentTimeCentral() {
  const options = {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };

  const centralTime = new Date().toLocaleString("en-US", options);
  return centralTime.replace(" at ", " at ").replace(",", "");
}

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
async function handleSubmissionFunction(type, args, sessionId, userId) {
  try {
    const webhookUrl = await secretsManager.getSecret("ZAPIER_WEBHOOK");

    // Send to Zapier
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        ...args,
        stationId: args.stationId,
        time: formatCurrentTimeCentral(),
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
      timestamp: admin.firestore.Timestamp.now(),
      zapierResponse: response.ok ? "Success" : "Failed",
      sessionId,
      userId,
      created: admin.firestore.FieldValue.serverTimestamp(),
      conversationRef: {
        sessionId,
        timestamp: formatCurrentTimeCentral(),
      },
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
    logger.error("Error in handleSubmissionFunction:", {
      error: error.message,
      type,
      sessionId,
    });
    throw error;
  }
}

/**
 * Formats and returns a Google search URL
 * @param {Object} args - Function arguments from OpenAI
 * @return {Object} Formatted Google search URL
 */
function handleGoogleSearch(args) {
  try {
    const searchUrl = `https://www.google.com/search?q=${args.keywords.join("+")}+${args.siteUrl}`;
    return {google_url: searchUrl};
  } catch (error) {
    logger.error("Error formatting Google search:", error);
    throw error;
  }
}

/**
 * Main function execution handler
 * @param {string} functionName - Name of the function to execute
 * @param {Object} args - Function arguments from OpenAI
 * @param {string} sessionId - Session identifier
 * @param {string} userId - User identifier
 * @return {Promise<Object>} Function result
 */
async function executeFunction(functionName, args, sessionId, userId) {
  logger.info("Executing function:", {functionName, sessionId});

  try {
    switch (functionName) {
      case "format_google_search":
        return handleGoogleSearch(args);

      case "submit_story":
        return handleSubmissionFunction("story", args, sessionId, userId);

      case "submit_digital_feedback":
        return handleSubmissionFunction(
            "digital feedback", args, sessionId, userId);

      case "submit_broadcast_feedback":
        return handleSubmissionFunction(
            "broadcast feedback", args, sessionId, userId);

      case "submit_digital_technical":
        return handleSubmissionFunction(
            "digital technical", args, sessionId, userId);

      case "submit_broadcast_technical":
        return handleSubmissionFunction(
            "broadcast technical", args, sessionId, userId);

      case "submit_advertising":
        return handleSubmissionFunction("advertising", args, sessionId, userId);

      default:
        logger.error("Unknown function called:", functionName);
        throw new Error(`Unknown function: ${functionName}`);
    }
  } catch (error) {
    logger.error("Error executing function:", {
      functionName,
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

module.exports = {
  executeFunction,
};
