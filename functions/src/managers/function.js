// functions/src/managers/function-manager.js
/**
 * @file Handles execution of functions called by OpenAI Assistant
 * @module function-manager
 */
const logger = require("../utils/logger");
const {formatCurrentTimeCentral} = require("../utils/time-utils");
const {handleDocumentSearch} = require("../functions/document-search");
const {handleSubmission} = require("../functions/submission");
const {getWeather} = require("../functions/weather");

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
      case "get_weather":
        return getWeather(args);

      case "get_current_time":
        return formatCurrentTimeCentral(args);

      case "document_search":
        return handleDocumentSearch(args);

      case "submit_story":
        return handleSubmission("story", args, sessionId, userId);

      case "submit_digital_feedback":
        return handleSubmission(
            "digital feedback", args, sessionId, userId);

      case "submit_broadcast_feedback":
        return handleSubmission(
            "broadcast feedback", args, sessionId, userId);

      case "submit_digital_technical":
        return handleSubmission(
            "digital technical", args, sessionId, userId);

      case "submit_broadcast_technical":
        return handleSubmission(
            "broadcast technical", args, sessionId, userId);

      case "submit_advertising":
        return handleSubmission(
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
