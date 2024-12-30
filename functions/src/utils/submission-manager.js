/**
 * Manages story submissions and other user feedback in Firestore
 * @module submission-manager
 */

const admin = require("firebase-admin");
const logger = require("./logger");
const secretsManager = require("./secrets-manager");

const db = admin.firestore();

/**
 * Formats current time to Central Time
 * @return {string} Formatted time string
 */
function formatCurrentTimeCentral() {
  const options = {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };

  const centralTime = new Date().toLocaleString("en-US", options);
  return centralTime.replace(" at ", " at ").replace(",", "");
}


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
      // Parse function call arguments
      const args = JSON.parse(functionCall.function.arguments);
      const functionName = functionCall.function.name;

      const webhookUrl = await secretsManager.getSecret("ZAPIER_WEBHOOK");
      let responseText; let type;

      // Assign variables based on function name
      switch (functionName) {
        case "submit_story":
          responseText = "Thank you! I've submitted your story idea to " +
          "our news team.\n" +
          "Is there anything else I can help you with?";
          type = "story";
          break;
        case "submit_feedback_digital":
          responseText = "Thank you for your feedback! We appreciate you " +
          "sharing your thoughts with us.\n" +
          "Is there anything else I can assist you with?";
          type = "digital feedback";
          break;
        case "submit_feedback_broadcast":
          responseText = "Thank you for your feedback! We appreciate you " +
            "sharing your thoughts with us.\n" +
            "Is there anything else I can assist you with?";
          type = "broadcast feedback";
          break;
        case "submit_technical_digital":
          responseText = "Thank you for reporting this technical issue! " +
          "Our team will look into it and get back to you if a follow up " +
          "is needed.\n" +
          "Is there anything else I can assist you with?";
          type = "digital technical";
          break;
        case "submit_technical_broadcast":
          responseText = "Thank you for reporting this technical issue! " +
            "Our team will look into it and get back to you if a follow up " +
            "is needed.\n" +
            "Is there anything else I can assist you with?";
          type = "broadcast technical";
          break;
        case "submit_advertising":
          responseText = "Thank you for your interest in advertising with " +
          "us! I've passed along your information to our sales team. " +
          "They'll reach out soon to discuss options if they think " +
          "we're a good fit.\n" +
          "Is there anything else I can assist you with?";
          type = "advertising";
          break;
        default:
          logger.error(`Unknown function called: ${functionName}`);
          return "I apologize, but I encountered an unexpected error.\n" +
          "Please try again.";
      }

      // Send to Zapier
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          ...args,
          stationId: args.stationId,
          time: formatCurrentTimeCentral(), // Add formatted time
        }),
      });

      const failedResponseText = "I apologize, but there was an issue " +
      "submitting your ${type} inquiry.\n" +
      "Please try again later.";
      responseText = response.ok ? responseText : failedResponseText;

      // Create submission document
      const submissionDoc = {
        type,
        content: args.description,
        timestamp: admin.firestore.Timestamp.fromDate(new Date(args.timestamp)),
        zapierResponse: response.ok ? "Success" : "Failed",
        sessionId,
        userId,
        created: admin.firestore.FieldValue.serverTimestamp(),
        conversationRef: {
          sessionId,
          timestamp: formatCurrentTimeCentral(),
        },
      };

      // Save to Firestore
      const docRef = await this.getSubmissionsRef(
          args.stationId).add(submissionDoc);

      // Log the submission
      logger.logSubmissionData({
        type,
        stationId: args.stationId,
        sessionId,
        content: args.description,
        zapierResponse: response.ok ? "Success" : "Failed",
        submissionId: docRef.id,
      });

      return responseText;
    } catch (error) {
      logger.error("Error in handleSubmission:", {error: error.message});
      throw error;
    }
  }
}

module.exports = new SubmissionManager();
