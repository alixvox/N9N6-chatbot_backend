/**
 * Session manager for N6 and N9 chatbots.
 * Handles creating, updating and deleting chat session
 * history onto Firebase.
 * @class SessionManager
 */
const admin = require("firebase-admin");
const logger = require("./logger");

const db = admin.firestore();

/**
 * @class SessionManager
 * @description Manages chat session data for N6 and N9 chatbots,
 * handling storage in both memory cache and Firestore. Includes
 * functionality for session creation, updates, and cleanup of old sessions.
 */class SessionManager {
  /**
   * Initializes session manager with separate memory caches for N6 and N9.
   * Sets up periodic cleanup of old sessions.
   */
  constructor() {
    this.sessions = {
      n6: new Map(),
      n9: new Map(),
    };
    setInterval(() => this.cleanupOldSessions(), 1800000); // 30 minutes
  }

  /**
   * Gets the Firestore reference for a station's sessions collection.
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {FirebaseFirestore.CollectionReference} - Firestore collection ref
   */
  getSessionsRef(stationId) {
    return db.collection(`sessions_${stationId}`);
  }

  /**
   * Retrieves an existing session or creates a new one if none exists.
   * @param {string} sessionId - Unique session identifier
   * @param {string} userId - User identifier
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<Object>} Session data object
   */
  async getOrCreateSession(sessionId, userId, stationId) {
    const stationSessions = this.sessions[stationId];
    const sessionsRef = this.getSessionsRef(stationId);

    // Check memory cache first
    if (stationSessions.has(sessionId)) {
      return stationSessions.get(sessionId);
    }

    // Check Firebase
    const sessionDoc = await sessionsRef.doc(sessionId).get();

    if (sessionDoc.exists) {
      const sessionData = sessionDoc.data();
      stationSessions.set(sessionId, sessionData);
      return sessionData;
    }

    // Create new session
    const newSession = {
      sessionId,
      userId,
      stationId,
      conversationHistory: [
        {
          role: "system",
          content: stationId === "n6" ?
        `You are a helpful assistant for News on 6 in Tulsa, OK. 
           You help users with information about news, weather, and 
           station-specific inquiries.` :
        `You are a helpful assistant for News on 9 in Oklahoma City, OK. 
           You help users with information about news, weather, and 
           station-specific inquiries.`,
        },
      ],
      lastActivity: Date.now(),
    };


    // Save to Firebase
    await sessionsRef.doc(sessionId).set(newSession);

    // Save to memory cache
    stationSessions.set(sessionId, newSession);
    logger.logSessionData(newSession);

    return newSession;
  }

  /**
   * Updates an existing session with a new message.
   * @param {string} sessionId - Session identifier
   * @param {string} message - Message content
   * @param {string} role - Message role ('user' or 'assistant')
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @param {Object} [sessionData] - Optional existing session data to
   * avoid extra reads
   * @return {Promise<Object|null>} Updated session data or null if not found
   */
  async updateSession(
      sessionId, message, role = "user", stationId, sessionData = null,
  ) {
    const stationSessions = this.sessions[stationId];
    const sessionsRef = this.getSessionsRef(stationId);

    // Use provided session data or cached data
    let session = sessionData || stationSessions.get(sessionId);

    if (!session) {
    // Only perform a read if we absolutely have to
      const sessionDoc = await sessionsRef.doc(sessionId).get();
      if (!sessionDoc.exists) return null;
      session = sessionDoc.data();
      stationSessions.set(sessionId, session);
    }

    session.conversationHistory.push({
      role,
      content: message,
    });
    session.lastActivity = Date.now();

    // Update Firebase
    await sessionsRef.doc(sessionId).update({
      conversationHistory: session.conversationHistory,
      lastActivity: session.lastActivity,
    });

    logger.logSessionData(session);
    return session;
  }
  /**
   * Removes sessions that have been inactive for more than an hour.
   * Cleans up both memory cache and Firestore storage.
   * @return {Promise<void>}
   */
  async cleanupOldSessions() {
    const now = Date.now();
    const OLD_SESSION_THRESHOLD = 3600000; // 1 hour

    for (const stationId of ["n6", "n9"]) {
      const sessionsRef = this.getSessionsRef(stationId);

      // Query for old sessions
      const oldSessions = await sessionsRef
          .where("lastActivity", "<", now - OLD_SESSION_THRESHOLD)
          .get();

      // Delete old sessions
      const batch = db.batch();
      oldSessions.forEach((doc) => {
        batch.delete(doc.ref);
        this.sessions[stationId].delete(doc.id);
      });

      await batch.commit();
    }
  }

  /**
   * Formats session data for OpenAI API consumption.
   * @param {string} sessionId - Session identifier
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<Object|null>} Formatted session data or null if not found
   */
  async getOpenAIFormat(sessionId, stationId) {
    const session = await this.getOrCreateSession(sessionId, null, stationId);
    if (session) {
      return logger.formatForOpenAI(session);
    }
    return null;
  }
}

module.exports = new SessionManager();
