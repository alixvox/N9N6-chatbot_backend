/**
 * Handles execution of functions called by OpenAI Assistant
 * @module function-manager
 */

const logger = require("./logger");
const functions = require("./function-handler");

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
        return functions.handleGoogleSearch(args);

      case "get_oklahoma_weather":
        return functions.handleWeather(args);

      case "get_current_time":
        return functions.handleCurrentTime(args);

      case "submit_story":
        return functions.handleSubmission("story", args, sessionId, userId);

      case "submit_digital_feedback":
        return functions.handleSubmission(
            "digital feedback", args, sessionId, userId);

      case "submit_broadcast_feedback":
        return functions.handleSubmission(
            "broadcast feedback", args, sessionId, userId);

      case "submit_digital_technical":
        return functions.handleSubmission(
            "digital technical", args, sessionId, userId);

      case "submit_broadcast_technical":
        return functions.handleSubmission(
            "broadcast technical", args, sessionId, userId);

      case "submit_advertising":
        return functions.handleSubmission(
            "advertising", args, sessionId, userId);

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
