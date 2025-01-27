// functions/src/utils/session-manager.js
/**
 * @file Handles creating, updating and deleting chat session
 * history onto Firebase.
 * @class SessionManager
 */
const admin = require("firebase-admin");
const {formatCurrentTimeCentral} = require("../utils/time-utils");
const logger = require("../utils/logger");

const db = admin.firestore();

const SESSION_EXPIRY_MS = 180 * 60 * 1000; // 3 hours in milliseconds
const MAX_MESSAGES = 20;

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
   * Deletes a session from Firestore
   * @param {string} userId - WatsonX user identifier
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<boolean>} Success status
   */
  async getActiveUserSession(userId, stationId) {
    const currentTime = Date.now();
    const snapshot = await this._getSessionsRef(stationId)
        .where("userId", "==", userId)
        .orderBy("lastActivity", "desc")
        .limit(1)
        .get();

    if (snapshot.empty) {
      return {session: null, docId: null};
    }

    const doc = snapshot.docs[0];
    const session = doc.data();

    // Check if session is expired (1 hour of inactivity)
    if (currentTime - session.lastActivity > SESSION_EXPIRY_MS) {
      return {session: null, docId: null};
    }

    return {session, docId: doc.id};
  }

  /**
   * Creates a new session with OpenAI thread
   * @param {string} userId - User identifier
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<Session>} Newly created session
   */
  async createUserSession(userId, stationId) {
    const docId = formatCurrentTimeCentral("session");
    const session = {
      userId,
      threadId: null,
      messages: [],
      lastActivity: Date.now(),
    };

    await this._getSessionsRef(stationId)
        .doc(docId)
        .set(session);

    logger.info("Created new user session", {
      userId,
      stationId,
      docId,
    });

    return {session, docId};
  }

  /**
     * Gets or creates a session for a user
     * @param {string} userId - User identifier
     * @param {string} stationId - Station identifier ('n6' or 'n9')
     * @return {Promise<{session: Object,
     * docId: string,
     * isNew: boolean}>} - Session info
     */
  async getOrCreateUserSession(userId, stationId) {
    const {session, docId} = await this.getActiveUserSession(userId, stationId);

    if (session) {
      return {session, docId, isNew: false};
    }

    const newSession = await this.createUserSession(userId, stationId);
    return {...newSession, isNew: true};
  }

  /**
     * Checks if a user's session has reached the message limit
     * @param {Object} session - Session object
     * @return {Object} Status object with count and warning message
     */
  checkMessageLimit(session) {
    const assistantCount = session.messages.filter(
        (msg) => msg.role === "assistant",
    ).length;

    let warningMessage = null;
    if (assistantCount === MAX_MESSAGES - 2) {
      warningMessage = "\n\n[2 more responses remaining for the advanced AI.]";
    } else if (assistantCount === MAX_MESSAGES - 1) {
      warningMessage = "\n\n[1 more response remaining for the advanced AI.]";
    } else if (assistantCount === MAX_MESSAGES) {
      warningMessage = "\n\n[Message limit for the advanced AI reached. " +
      "Reverting to the previous model.]";
    }

    return {
      count: assistantCount,
      hasReachedLimit: assistantCount > MAX_MESSAGES,
      warningMessage,
    };
  }

  /**
   * Updates the OpenAI thread ID for a session
   * @param {string} docId - Firestore document ID
   * @param {string} threadId - OpenAI thread identifier
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<boolean>} Success status
   */
  async updateThreadId(docId, threadId, stationId) {
    try {
      await this._getSessionsRef(stationId)
          .doc(docId)
          .update({threadId});

      logger.info("Updated thread ID for session", {
        docId,
        threadId,
        stationId,
      });

      return true;
    } catch (error) {
      logger.error("Error updating thread ID", {
        docId,
        threadId,
        stationId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Adds a new message to the session
   * @param {string} docId - Firestore document ID
   * @param {string} content - Message content
   * @param {string} role - Message role ('user' or 'assistant')
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<Object|null>} Updated session or null if not found
   */
  async addMessage(docId, content, role, stationId) {
    const docRef = this._getSessionsRef(stationId).doc(docId);

    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    try {
      await docRef.update({
        messages: admin.firestore.FieldValue.arrayUnion(message),
        lastActivity: Date.now(),
      });

      logger.info("Added message to session", {
        docId,
        stationId,
        role,
        timestamp: message.timestamp,
      });

      const updatedDoc = await docRef.get();
      return updatedDoc.data();
    } catch (error) {
      logger.error("Error adding message", {
        docId,
        stationId,
        role,
        error: error.message,
      });
      return null;
    }
  }
}

module.exports = new SessionManager();
