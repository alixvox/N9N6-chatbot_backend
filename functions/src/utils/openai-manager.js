/**
 * OpenAI integration handler
 * @module openai
 */

const logger = require("./logger");
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
 * @param {string} stationId - The station identifier ('n6' or 'n9')
 * @param {string} sessionId - The session identifier
 * @param {string} userId - The user identifier
 * @return {Promise<Object>} Response body for WatsonX webhook
 */
const getResponseBody = async (stationId, sessionId, userId) => {
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
      const responseText = await submissionManager.handleSubmission(
          functionCall,
          sessionId,
          userId,
      );

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
          "request.\n\n" +
          "Please try again.",
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
 * @param {Object} formattedSession - The formatted session data
 * @param {string} stationId - The station identifier
 * @param {string} sessionId - The session identifier
 * @param {string} userId - The user identifier
 * @return {Promise<Object>} OpenAI's response
 */
const processMessage = async (
    formattedSession, stationId, sessionId, userId) => {
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
            name: openAIFunctions.submitStory.function.name,
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

module.exports = {
  getResponseBody,
  // Export functions for use in other parts of the application
  functions: openAIFunctions.getAllFunctions(),
};
