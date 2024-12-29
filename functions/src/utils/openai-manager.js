/**
 * OpenAI integration handler
 * @module openai
 */

const logger = require("./logger");
const secretsManager = require("./secrets-manager");
const sessionManager = require("./session-manager");
const submissionManager = require("./submission-manager");
const openAIFunctions = require("./openai-functions");

/**
 * Formats session data for OpenAI API consumption
 * @param {Object} sessionData - The session data to format
 * @return {Object} Formatted data for OpenAI API
 */
const formatForOpenAI = (sessionData) => {
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
};

/**
 * Gets the appropriate response text based on OpenAI's response
 * @param {string} message - The user's message
 * @param {string} stationId - The station identifier ('n6' or 'n9')
 * @param {string} sessionId - The session identifier
 * @param {string} userId - The user identifier
 * @return {Promise<Object>} Response body for WatsonX webhook
 */
const getResponseBody = async (message, stationId, sessionId, userId) => {
  try {
    // Get session data from Firestore
    const sessionData = await sessionManager.getOrCreateSession(
        sessionId,
        userId,
        stationId,
    );

    // Format session data for OpenAI
    const formattedSession = formatForOpenAI(sessionData);

    // Process through OpenAI (mock for now)
    const openAIResponse = await processMessage(
        message,
        formattedSession, // Pass the formatted session data
        stationId,
        sessionId,
        userId,
    );
    const choice = openAIResponse.choices[0].message;

    // If OpenAI returned a direct message to the user
    if (choice.content) {
      return {
        output: {
          generic: [{
            response_type: "text",
            text: choice.content,
          }],
        },
      };
    }

    // If OpenAI called a function
    if (choice.tool_calls) {
      const functionCall = choice.tool_calls[0];
      const result = await handleSubmission(functionCall, sessionId, userId);

      let responseText;
      switch (result.functionName) {
        case "submit_story":
          responseText = result.success ?
            "Thank you! I've submitted your story idea to our news team. " +
            "Is there anything else I can help you with?" :
            "I apologize, but there was an issue submitting your story. " +
            "Please try again later.";
          break;
        default:
          responseText = "I apologize, but I encountered an unexpected " +
          "error. Please try again.";
      }

      return {
        output: {
          generic: [{
            response_type: "text",
            text: responseText,
          }],
        },
      };
    }

    // Fallback response if something unexpected happened
    return {
      output: {
        generic: [{
          response_type: "text",
          text: "I apologize, but I'm having trouble processing your " +
          "request. Please try again.",
        }],
      },
    };
  } catch (error) {
    logger.error("Error in getResponseBody:", error);
    throw error;
  }
};

/**
 * Processes a chat message through OpenAI (mock for testing)
 * @param {string} message - The user's message
 * @param {Object} formattedSession - The formatted session data
 * @param {string} stationId - The station identifier
 * @param {string} sessionId - The session identifier
 * @param {string} userId - The user identifier
 * @return {Promise<Object>} OpenAI's response
 */
const processMessage = async (
    message, formattedSession, stationId, sessionId, userId) => {
  // For testing, we'll mock an OpenAI response that calls the
  // submit_story function. Later, this will be replaced with actual
  // OpenAI API calls
  return {
    choices: [{
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_" + Date.now(),
          type: "function",
          function: {
            // Reference the function name from our definitions
            name: openAIFunctions.submitStory.name,
            arguments: JSON.stringify({
              description: "Mock story submission for testing",
              timestamp: new Date().toISOString(),
              stationId: stationId,
            }),
          },
        }],
      },
    }],
  };
};

/**
 * Handles the submission to Zapier and Firestore based on the function called
 * @param {Object} functionCall - The function call details
 * @param {string} sessionId - The session identifier
 * @param {string} userId - The user identifier
 */
const handleSubmission = async (functionCall, sessionId, userId) => {
  try {
    const args = JSON.parse(functionCall.function.arguments);

    // Determine which function was called
    switch (functionCall.function.name) {
      case openAIFunctions.submitStory.name: {
        // Get Zapier webhook URL from Secret Manager
        const webhookUrl = await secretsManager.getSecret("ZAPIER_STORY");

        // Send to Zapier
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(args),
        });

        // Store in Firestore using submission manager
        await submissionManager.createStorySubmission({
          stationId: args.stationId,
          description: args.description,
          timestamp: args.timestamp,
          sessionId,
          userId,
          zapierResponse: response.ok ? "Success" : "Failed",
        });

        return {
          success: response.ok,
          functionName: "submit_story",
        };
      }
      default:
        logger.error(`Unknown function called: ${functionCall.function.name}`);
        return {
          success: false,
          functionName: functionCall.function.name,
        };
    }
  } catch (error) {
    logger.error("Error in handleSubmission:", error);
    throw error;
  }
};

module.exports = {
  getResponseBody,
  // Export functions for use in other parts of the application
  functions: openAIFunctions.getAllFunctions(),
};