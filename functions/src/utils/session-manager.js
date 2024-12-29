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
 * Gets the most recent relevant conversation history within token limits
 * @param {string} sessionId - Session identifier
 * @param {string} stationId - Station identifier ('n6' or 'n9')
 * @param {number} maxTokens - Maximum tokens to include in history
 * @return {Promise<Object|null>} Truncated session data for OpenAI
 */
  async getRecentHistory(sessionId, stationId, maxTokens = 4000) {
  // Use existing method that handles Firestore logic
    const session = await this.getOrCreateSession(sessionId, null, stationId);
    if (!session) return null;

    // Always include system message
    const systemMessage = session.conversationHistory[0];
    const recentMessages = [systemMessage];

    // Add most recent messages until we hit token limit
    // This is a simple approximation - you might want to use a
    // proper token counter
    let estimatedTokens = systemMessage.content.length / 4;

    for (let i = session.conversationHistory.length - 1; i > 0; i--) {
      const message = session.conversationHistory[i];
      const messageTokens = message.content.length / 4;

      if (estimatedTokens + messageTokens > maxTokens) break;

      recentMessages.unshift(message);
      estimatedTokens += messageTokens;
    }

    return {
      ...session,
      conversationHistory: recentMessages,
    };
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
