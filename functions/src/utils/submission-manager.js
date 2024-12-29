/**
 * Manages story submissions and other user feedback in Firestore
 * @module submission-manager
 */

const admin = require("firebase-admin");
const logger = require("./logger");

const db = admin.firestore();

/**
 * @class SubmissionManager
 * @description Handles storing and retrieving submissions from Firestore
 */
class SubmissionManager {
  /**
   * Gets the Firestore reference for a station's submissions collection
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {FirebaseFirestore.CollectionReference} Firestore collection ref
   */
  getSubmissionsRef(stationId) {
    return db.collection(`submissions_${stationId}`);
  }

  /**
   * Stores a story submission in Firestore
   * @param {Object} submission - Submission details
   * @param {string} submission.stationId - Station identifier ('n6' or 'n9')
   * @param {string} submission.description - Story description
   * @param {string} submission.timestamp - Submission timestamp
   * @param {string} submission.sessionId - Chat session ID
   * @param {string} submission.userId - User identifier
   * @param {string} submission.zapierResponse - Response from Zapier webhook
   * @return {Promise<FirebaseFirestore.DocumentReference>} Created document
   * reference
   */
  async createStorySubmission(submission) {
    try {
      const submissionDoc = {
        type: "story",
        content: submission.description,
        timestamp: admin.firestore.Timestamp.fromDate(
            new Date(submission.timestamp)),
        zapierResponse: submission.zapierResponse,
        sessionId: submission.sessionId,
        userId: submission.userId,
        created: admin.firestore.FieldValue.serverTimestamp(),
        // Adding OpenAI conversation reference
        conversationRef: {
          sessionId: submission.sessionId,
          timestamp: submission.timestamp,
        },
      };

      const docRef = await this.getSubmissionsRef(
          submission.stationId).add(submissionDoc);

      logger.info("Created story submission", {
        submissionId: docRef.id,
        stationId: submission.stationId,
      });

      return docRef;
    } catch (error) {
      logger.error("Error creating story submission:", error);
      throw error;
    }
  }
}

module.exports = new SubmissionManager();
