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

// Expiry and cooldown periods for chat sessions
const SESSION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
const COOLDOWN_PERIOD_MS = 180 * 60 * 1000; // 3 hours in milliseconds
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
   * Gets or creates a user session for a given user and station
   * @param {string} userId - User identifier
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<{Object}>} - Session object, document ID, and status
   */
  async getOrCreateUserSession(userId, stationId) {
    const currentTime = Date.now();

    // Try to find most recent session for this user
    const snapshot = await this._getSessionsRef(stationId)
        .where("userId", "==", userId)
        .orderBy("lastActivity", "desc")
        .limit(1)
        .get();

    // If no previous session exists, create new one
    if (snapshot.empty) {
      const docId = formatCurrentTimeCentral("session");
      const newSession = {
        userId,
        threadId: null,
        messages: [],
        lastActivity: currentTime,
      };

      await this._getSessionsRef(stationId)
          .doc(docId)
          .set(newSession);

      logger.info("Created first user session", {
        userId,
        stationId,
        docId,
      });

      return {
        session: newSession,
        docId,
        status: "active",
      };
    }

    // Get the most recent session
    const doc = snapshot.docs[0];
    const existingSession = doc.data();
    const timeSinceLastActivity = currentTime - existingSession.lastActivity;

    // Count messages in most recent session
    const messageCount = existingSession.messages.filter(
        (msg) => msg.role === "user",
    ).length;

    // Check cooldown if max messages reached
    if (messageCount >= MAX_MESSAGES &&
        timeSinceLastActivity <= COOLDOWN_PERIOD_MS) {
      const remainingCooldown = COOLDOWN_PERIOD_MS - timeSinceLastActivity;
      return {
        session: null,
        docId: null,
        status: "cooldown",
        remainingCooldown,
      };
    }

    // Check if we need a new session due to expiry
    if (timeSinceLastActivity > SESSION_EXPIRY_MS) {
      const docId = formatCurrentTimeCentral("session");
      const newSession = {
        userId,
        threadId: null,
        messages: [],
        lastActivity: currentTime,
      };

      await this._getSessionsRef(stationId)
          .doc(docId)
          .set(newSession);

      logger.info("Created new session after expiry", {
        userId,
        stationId,
        docId,
        previousSessionId: doc.id,
        timeSinceLastActivity,
      });

      return {
        session: newSession,
        docId,
        status: "active",
      };
    }

    // Session is active and valid
    return {
      session: existingSession,
      docId: doc.id,
      status: "active",
    };
  }

  /**
     * Checks if a user's session has reached the message limit
     * @param {Object} session - Session object
     * @return {Object} Status object with count and warning message
     */
  checkMessageLimit(session) {
    // Count the future number of user messages in the session
    const messageCount = session.messages.filter(
        (msg) => msg.role === "user",
    ).length;

    let warningMessage = null;
    if (messageCount === MAX_MESSAGES - 2) {
      warningMessage = "\n\n[2 more responses remaining for the advanced AI.]";
    } else if (messageCount === MAX_MESSAGES - 1) {
      warningMessage = "\n\n[1 more response remaining for the advanced AI.]";
    } else if (messageCount === MAX_MESSAGES) {
      warningMessage = "\n\n[Message limit for the advanced AI reached. " +
      "Reverting to the previous model.]";
    }

    return {
      count: messageCount,
      hasReachedLimit: messageCount > MAX_MESSAGES,
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
