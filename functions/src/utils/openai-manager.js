/**
 * OpenAI integration handler
 * @module openai-manager
 */

const OpenAI = require("openai");
const logger = require("./logger");
const sessionManager = require("./session-manager");
const functionManager = require("./function-manager");
const secretsManager = require("./secrets-manager");

/**
 * Creates a new OpenAI client instance
 * @return {Promise<{client: OpenAI, n6Id: string, n9Id: string}>}
 */
const createOpenAIClient = async () => {
  const apiKey = await secretsManager.getSecret("OPENAI_SERVICE_API_KEY");
  const n9Id = await secretsManager.getSecret("N9_ASSISTANT_ID");
  const n6Id = await secretsManager.getSecret("N6_ASSISTANT_ID");

  return {
    client: new OpenAI({apiKey}),
    n6Id,
    n9Id,
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

    // Get OpenAI client
    const {client, n6Id, n9Id} = await createOpenAIClient();
    const assistantId = stationId === "n6" ? n6Id : n9Id;

    // Format messages for OpenAI
    const messages = sessionData.conversationHistory
        .filter((msg) => msg.content && msg.content.trim())
        .map((msg) => ({
          role: msg.role,
          content: msg.content.trim(),
        }));

    // Initial API call to OpenAI
    let response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      assistant_id: assistantId,
    });

    const assistantMessage = response.choices[0].message;

    // If it's a direct message (no function call)
    if (assistantMessage.content && !assistantMessage.tool_calls) {
      return {
        output: {
          generic: [{
            response_type: "text",
            text: assistantMessage.content,
          }],
        },
      };
    }

    // If it's a function call
    if (assistantMessage.tool_calls) {
      const toolCall = assistantMessage.tool_calls[0];

      logger.info("Received function call from OpenAI:", {
        toolCall,
        argumentType: typeof toolCall.function.arguments,
      });

      const {name: functionName, arguments: argsString} = toolCall.function;

      // Log before parsing to see the raw format
      logger.info("Function arguments before parsing:", {
        argsString,
        isString: typeof argsString === "string",
      });

      const args = JSON.parse(argsString);

      // Execute the function and get result
      const functionResult = await functionManager.executeFunction(
          functionName,
          args,
          sessionId,
          userId,
      );

      logger.info("Function execution result:", {
        functionName,
        result: functionResult,
        resultType: typeof functionResult,
      });

      // Determine if we need to stringify the result
      const resultContent = typeof functionResult === "string" ?
        functionResult :
        JSON.stringify(functionResult);

      logger.info("Sending function result to OpenAI:", {
        functionName,
        resultContent,
      });

      // Send function result back to OpenAI for final response
      response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          ...messages,
          assistantMessage,
          {
            role: "function",
            name: functionName,
            content: JSON.stringify(functionResult),
          },
        ],
        assistant_id: assistantId,
      });

      // Get final message that includes function result context
      const finalMessage = response.choices[0].message;

      return {
        output: {
          generic: [{
            response_type: "text",
            text: finalMessage.content,
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

module.exports = {
  getResponseBody,
};
