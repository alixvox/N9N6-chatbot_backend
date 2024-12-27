/**
 * Session logging utility for N6 and N9 chatbots.
 * Handles writing session data to log files and formatting for OpenAI.
 * @class SessionLogger
 */
const fs = require("fs");
const path = require("path");

/**
 * @class SessionLogger
 * @description Manages logging operations for both N6 and N9 chatbot sessions.
 * Handles writing session data to log files, formatting data for OpenAI,
 * and maintaining separate logs for each station.
 */
class SessionLogger {
  /**
   * Creates a new SessionLogger instance and initializes log directory.
   */
  constructor() {
    this.logDir = path.join(__dirname, "../../logs");
    this.sessionLogPath = path.join(this.logDir, "sessions.log");
    this.errorLogPath = path.join(this.logDir, "error.log");

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  /**
   * Logs error messages to error.log
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or details
   */
  error(message, error) {
    const timestamp = new Date().toISOString();
    const errorEntry = {
      timestamp,
      message,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
      } : error,
    };

    fs.appendFileSync(
        this.errorLogPath,
        JSON.stringify(errorEntry, null, 2) + "\n---\n",
        "utf8",
    );
  }

  /**
     * Logs warning messages
     * @param {string} message - Warning message
     * @param {Object} [details] - Additional warning details
     */
  warn(message, details = {}) {
    const timestamp = new Date().toISOString();
    const warnEntry = {
      timestamp,
      level: "WARN",
      message,
      ...details,
    };

    fs.appendFileSync(
        this.errorLogPath,
        JSON.stringify(warnEntry, null, 2) + "\n---\n",
        "utf8",
    );
  }

  /**
   * Logs session data to a station-specific log file.
   * @param {Object} sessionData - The session data to log
   * @param {string} sessionData.stationId - Station identifier ('n6' or 'n9')
   * @param {string} sessionData.sessionId - Unique session identifier
   * @param {Array} sessionData.conversationHistory - Array of session messages
   */
  logSessionData(sessionData) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ...sessionData,
    };

    const stationLogPath = path.join(
        this.logDir,
        `sessions_${sessionData.stationId}.log`,
    );

    fs.appendFileSync(
        stationLogPath,
        JSON.stringify(logEntry, null, 2) + "\n---\n",
        "utf8",
    );
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
   * Retrieves all session logs.
   * @return {string} Combined log content
   */
  getSessionsLog() {
    const stations = ["n6", "n9"];
    let allLogs = "";

    for (const station of stations) {
      const stationLogPath = path.join(this.logDir, `sessions_${station}.log`);
      if (fs.existsSync(stationLogPath)) {
        allLogs += `\n=== ${station.toUpperCase()} Logs ===\n`;
        allLogs += fs.readFileSync(stationLogPath, "utf8");
      }
    }

    return allLogs || "No session logs yet.";
  }
}

module.exports = new SessionLogger();

