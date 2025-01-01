// functions/src/utils/session-manager.js
/**
 * @file Handles creating, updating and deleting chat session
 * history onto Firebase.
 * @class SessionManager
 */
const admin = require("firebase-admin");
const {formatCurrentTimeCentral} = require("./time-utils");
const logger = require("./logger");

const db = admin.firestore();

/**
 * @class SessionManager
 * @description Manages chat session data for N6 and N9 chatbots,
 * handling storage in Firestore. Includes functionality for
 * session creation, updates, and cleanup of old sessions.
 */class SessionManager {
  /**
   * Gets the Firestore reference for a station's sessions collection
   * @private
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {FirebaseFirestore.CollectionReference} Firestore collection ref
   */
  _getSessionsRef(stationId) {
    return db.collection(`sessions_${stationId}`);
  }

  /**
   * Creates a new session with OpenAI thread
   * @param {string} sessionId - WatsonX session identifier
   * @param {string} userId - User identifier
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<Session>} Newly created session
   */
  async createSession(sessionId, userId, stationId) {
    const docId = formatCurrentTimeCentral("session");
    const session = {
      sessionId,
      userId,
      threadId: null,
      messages: [],
      lastActivity: Date.now(),
    };

    await this._getSessionsRef(stationId)
        .doc(docId)
        .set(session);

    logger.info("Created new session", {
      sessionId,
      userId,
      stationId,
      docId,
    });

    return session;
  }

  /**
   * Updates the OpenAI thread ID for a session
   * @param {string} sessionId - WatsonX session identifier
   * @param {string} threadId - OpenAI thread identifier
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<boolean>} Success status
   */
  async updateThreadId(sessionId, threadId, stationId) {
    const snapshot = await this._getSessionsRef(stationId)
        .where("sessionId", "==", sessionId)
        .limit(1)
        .get();

    if (snapshot.empty) {
      logger.error("Session not found for thread ID update", {
        sessionId,
        threadId,
        stationId,
      });
      return false;
    }

    const docRef = snapshot.docs[0].ref;
    await docRef.update({threadId});

    logger.info("Updated thread ID for session", {
      sessionId,
      threadId,
      stationId,
    });

    return true;
  }

  /**
   * Retrieves a session by WatsonX session ID
   * @param {string} sessionId - WatsonX session identifier
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<Session|null>} Session data or null if not found
   */
  async getSession(sessionId, stationId) {
    const snapshot = await this._getSessionsRef(stationId)
        .where("sessionId", "==", sessionId)
        .limit(1)
        .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  }

  /**
   * Adds a new message to the session
   * @param {string} sessionId - WatsonX session identifier
   * @param {string} content - Message content
   * @param {string} role - Message role ('user' or 'assistant')
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<Session|null>} Updated session or null if not found
   */
  async addMessage(sessionId, content, role, stationId) {
    const session = await this.getSession(sessionId, stationId);
    if (!session) return null;

    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    const snapshot = await this._getSessionsRef(stationId)
        .where("sessionId", "==", sessionId)
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const docRef = snapshot.docs[0].ref;

    await docRef.update({
      messages: admin.firestore.FieldValue.arrayUnion(message),
      lastActivity: Date.now(),
    });

    logger.info("Added message to session", {
      sessionId,
      stationId,
      role,
      timestamp: message.timestamp,
    });

    const updatedDoc = await docRef.get();
    return updatedDoc.data();
  }
}

module.exports = new SessionManager();
