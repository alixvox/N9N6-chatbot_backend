// functions/src/utils/logger.js
/**
 * @file Firebase logging utility for N6 and N9 chatbots.
 * @module logger
 */

const logger = require("firebase-functions/logger");

/**
 * @class SessionLogger
 * @description Manages logging operations for both N6 and N9 chatbot sessions.
 * Provides structured logging through Firebase logger.
 */
class SessionLogger {
  /**
   * Logs error messages using Firebase logger
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or details
   */
  error(message, error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
    } : error;

    logger.error(message, {
      error: errorDetails,
      timestamp: new Date().toISOString(),
      structuredData: true,
    });
  }

  /**
   * Logs warning messages using Firebase logger
   * @param {string} message - Warning message
   * @param {Object} [details] - Additional warning details
   */
  warn(message, details = {}) {
    logger.warn(message, {
      ...details,
      timestamp: new Date().toISOString(),
      structuredData: true,
    });
  }

  /**
   * Logs general info messages using Firebase logger
   * @param {string} message - Info message
   * @param {Object} [details] - Additional details
   */
  info(message, details = {}) {
    logger.info(message, {
      ...details,
      timestamp: new Date().toISOString(),
      structuredData: true,
    });
  }

  /**
   * Logs session data using Firebase logger
   * @param {Object} sessionData - The session data to log
   * @param {string} sessionData.stationId - Station identifier ('n6' or 'n9')
   * @param {string} sessionData.sessionId - Unique session identifier
   * @param {Array} sessionData.conversationHistory - Array of session messages
   */
  logSessionData(sessionData) {
    const {stationId, sessionId, userId, conversationHistory} = sessionData;

    logger.info("Session activity", {
      type: "session",
      stationId,
      sessionId,
      userId,
      messageCount: conversationHistory.length,
      lastMessage: conversationHistory[conversationHistory.length - 1]?.content,
      timestamp: new Date().toISOString(),
      structuredData: true,
    });
  }

  /**
   * Logs submission data using Firebase logger
   * @param {Object} submissionData - The submission data to log
   * @param {string} submissionData.type - Type of submission ('story',
   * 'feedback', 'advertising', 'technical')
   * @param {string} submissionData.stationId - Station identifier
   * ('n6' or 'n9')
   * @param {string} submissionData.sessionId - Associated session identifier
   * @param {string} submissionData.content - Submission content
   * @param {string} submissionData.zapierResponse - Response from
   * Zapier webhook
   */
  logSubmissionData(submissionData) {
    const {
      type, stationId, sessionId, content, zapierResponse,
    } = submissionData;

    logger.info("New submission", {
      type,
      stationId,
      sessionId,
      contentPreview: content.substring(0, 100) + (
        content.length > 100 ? "..." : ""),
      zapierStatus: zapierResponse === "Success" ? "Success" : "Failed",
      timestamp: new Date().toISOString(),
      structuredData: true,
    });
  }

  /**
   * Info about accessing logs
   * @return {string} Information about how to access logs
   */
  getSessionsLog() {
    return [
      "Logs are available in the Firebase Console under Functions > Logs,",
      "or through the Firebase CLI using 'firebase functions:log'.",
      "",
      "Filter logs by adding any of these terms:",
      "- 'Session activity' for session logs",
      "- 'New submission' for submission logs",
      "- 'severity=error' for error logs",
      "",
      "Example: firebase functions:log --only api --filter='Session activity'",
    ].join("\n");
  }
}

module.exports = new SessionLogger();
