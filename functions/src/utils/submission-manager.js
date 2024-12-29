/**
 * Manages story submissions and other user feedback in Firestore
 * @module submission-manager
 */

const admin = require("firebase-admin");
const logger = require("./logger");
const secretsManager = require("./secrets-manager");

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
   * Handles function calls from OpenAI
   * @param {Object} functionCall - The function call details from OpenAI
   * @param {string} sessionId - The session identifier
   * @param {string} userId - The user identifier
   * @return {Promise<string>} Response message to send back to user
   */
  async handleSubmission(functionCall, sessionId, userId) {
    try {
      const args = JSON.parse(functionCall.function.arguments);
      const functionName = functionCall.function.name;

      switch (functionName) {
        case "submit_story": {
          const response = await this.createStorySubmission({
            ...args,
            sessionId,
            userId,
          });
          return response.responseText;
        }
        default:
          logger.error(`Unknown function called: ${functionName}`);
          return "I apologize, but I encountered an unexpected error. " +
          "Please try again.";
      }
    } catch (error) {
      logger.error("Error in handleSubmission:", error);
      throw error;
    }
  }

  /**
   * Creates a story submission and sends it to Zapier
   * @param {Object} submission - Submission details
   * @param {string} submission.stationId - Station identifier ('n6' or 'n9')
   * @param {string} submission.description - Story description
   * @param {string} submission.timestamp - Submission timestamp
   * @param {string} submission.sessionId - Chat session ID
   * @param {string} submission.userId - User identifier
   * @return {Promise<Object>} Submission result with response text
   */
  async createStorySubmission(submission) {
    try {
      // Get Zapier webhook URL
      const webhookUrl = await secretsManager.getSecret("ZAPIER_STORY");

      // Send to Zapier
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          description: submission.description,
          timestamp: submission.timestamp,
          stationId: submission.stationId,
        }),
      });

      // Create submission document
      const submissionDoc = {
        type: "story",
        content: submission.description,
        timestamp: admin.firestore.Timestamp.fromDate(
            new Date(submission.timestamp)),
        zapierResponse: response.ok ? "Success" : "Failed",
        sessionId: submission.sessionId,
        userId: submission.userId,
        created: admin.firestore.FieldValue.serverTimestamp(),
        conversationRef: {
          sessionId: submission.sessionId,
          timestamp: submission.timestamp,
        },
      };

      // Save to Firestore
      const docRef = await this.getSubmissionsRef(
          submission.stationId).add(submissionDoc);

      // Log the submission
      logger.logSubmissionData({
        type: "story",
        stationId: submission.stationId,
        sessionId: submission.sessionId,
        content: submission.description,
        zapierResponse: response.ok ? "Success" : "Failed",
        submissionId: docRef.id,
      });

      return {
        id: docRef.id,
        responseText: response.ok ?
          "Thank you! I've submitted your story idea to our news team. " +
          "Is there anything else I can help you with?" :
          "I apologize, but there was an issue submitting your story. " +
          "Please try again later.",
      };
    } catch (error) {
      logger.error("Error creating story submission:", error);
      throw error;
    }
  }
}

module.exports = new SubmissionManager();
