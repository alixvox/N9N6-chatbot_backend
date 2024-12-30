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
 * handling storage in Firestore. Includes functionality for
 * session creation, updates, and cleanup of old sessions.
 */class SessionManager {
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
    const sessionsRef = this.getSessionsRef(stationId);

    // Check Firebase
    const sessionDoc = await sessionsRef.doc(sessionId).get();

    if (sessionDoc.exists) {
      return sessionDoc.data();
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
  async updateSession(sessionId, message, role, stationId) {
    const sessionsRef = this.getSessionsRef(stationId);
    const sessionDoc = await sessionsRef.doc(sessionId).get();

    if (!sessionDoc.exists) return null;
    const session = sessionDoc.data();

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
}

module.exports = new SessionManager();
