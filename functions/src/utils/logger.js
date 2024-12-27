/**
 * Session logging utility for N6 and N9 chatbots.
 * Handles writing session data to log files and formatting for OpenAI.
 * @class SessionLogger
 */
const logger = require("firebase-functions/logger");

/**
 * @class SessionLogger
 * @description Manages logging operations for both N6 and N9 chatbot sessions.
 * Handles writing session data to log files, formatting data for OpenAI,
 * and maintaining separate logs for each station.
 */
class SessionLogger {
  /**
   * Creates a new SessionLogger instance.
   * Initializes in-memory storage for recent logs with separate arrays for
   * N6, N9, and error logs. Memory storage is limited to prevent excessive
   * memory usage in the cloud environment.
   * @constructor
   * @memberof SessionLogger
   * @property {Object} memoryLogs - Object containing arrays for storing
   * recent logs
   * @property {Array} memoryLogs.n6 - Array storing recent N6 station logs
   * @property {Array} memoryLogs.n9 - Array storing recent N9 station logs
   * @property {Array} memoryLogs.error - Array storing recent error logs
   * @property {number} maxMemoryLogs - Maximum number of logs to keep in
   * memory per type
   */
  constructor() {
    // Initialize memory storage for recent logs (useful for getSessionsLog)
    this.memoryLogs = {
      n6: [],
      n9: [],
      error: [],
    };
    // Maximum number of logs to keep in memory
    this.maxMemoryLogs = 100;
  }

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

    // Log to Firebase
    logger.error(message, {
      error: errorDetails,
      structuredData: true,
    });

    // Store in memory for recent logs access
    this.memoryLogs.error.unshift({
      timestamp: new Date().toISOString(),
      message,
      error: errorDetails,
    });

    // Trim memory logs if needed
    if (this.memoryLogs.error.length > this.maxMemoryLogs) {
      this.memoryLogs.error.pop();
    }
  }

  /**
   * Logs warning messages using Firebase logger
   * @param {string} message - Warning message
   * @param {Object} [details] - Additional warning details
   */
  warn(message, details = {}) {
    // Log to Firebase
    logger.warn(message, {
      ...details,
      structuredData: true,
    });

    // Store in memory for recent logs access
    this.memoryLogs.error.unshift({
      timestamp: new Date().toISOString(),
      level: "WARN",
      message,
      ...details,
    });

    // Trim memory logs if needed
    if (this.memoryLogs.error.length > this.maxMemoryLogs) {
      this.memoryLogs.error.pop();
    }
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

    // Log to Firebase with structured data
    logger.info("Session activity", {
      stationId,
      sessionId,
      userId,
      messageCount: conversationHistory.length,
      lastMessage: conversationHistory[conversationHistory.length - 1]?.content,
      structuredData: true,
    });

    // Store in memory for recent logs access
    this.memoryLogs[stationId]?.unshift({
      timestamp: new Date().toISOString(),
      ...sessionData,
    });

    // Trim memory logs if needed
    if (this.memoryLogs[stationId]?.length > this.maxMemoryLogs) {
      this.memoryLogs[stationId].pop();
    }
  }

  /**
   * Formats session data for OpenAI API consumption.
   * @param {Object} sessionData - The session data to format
   * @return {Object} Formatted data for OpenAI
   */
  formatForOpenAI(sessionData) {
    const formattedMessages = sessionData.conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    return {
      messages: formattedMessages,
      metadata: {
        station_id: sessionData.stationId,
        user_id: sessionData.userId,
        session_id: sessionData.sessionId,
      },
    };
  }

  /**
   * Retrieves recent session logs from memory.
   * Note: This will only show logs from the current instance's memory.
   * @return {string} Combined log content
   */
  getSessionsLog() {
    const stations = ["n6", "n9"];
    let allLogs = "";

    for (const station of stations) {
      if (this.memoryLogs[station]?.length > 0) {
        allLogs += `\n=== ${station.toUpperCase()} Logs ===\n`;
        allLogs += this.memoryLogs[station]
            .map((log) => JSON.stringify(log, null, 2))
            .join("\n---\n");
      }
    }

    if (this.memoryLogs.error.length > 0) {
      allLogs += "\n=== Error Logs ===\n";
      allLogs += this.memoryLogs.error
          .map((log) => JSON.stringify(log, null, 2))
          .join("\n---\n");
    }

    return allLogs || "No session logs available in current instance.";
  }
}

module.exports = new SessionLogger();
