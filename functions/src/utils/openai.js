/**
 * OpenAI API manager for N6 and N9 chatbots.
 * Handles message processing and function calls.
 * @class OpenAIManager
 */
require("dotenv").config();
const {OpenAI} = require("openai");

/**
 * @class OpenAIManager
 * @description Manages interactions with OpenAI API for N6 and N9 chatbots.
 * Handles message processing, function calling, and maintains separate
 * assistant configurations for each station. Includes story submission
 * functionality and specialized response handling.
 */
class OpenAIManager {
  /**
   * Creates a new OpenAIManager instance and initializes OpenAI client.
   */
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.assistants = {
      n6: process.env.N6_ASSISTANT_ID,
      n9: process.env.N9_ASSISTANT_ID,
    };

    this.functions = [
      {
        name: "submitStory",
        description: "Submit a news story provided by the user.",
        parameters: {
          type: "object",
          properties: {
            contactInfo: {
              type: "string",
              description: "User contact information",
            },
            storyContent: {
              type: "string",
              description: "Content of the news story",
            },
          },
          required: ["storyContent"],
        },
      },
    ];
  }

  /**
   * Processes a message using OpenAI API.
   * @param {Object} sessionData - Current session data
   * @return {string} Response message or function call result
   */
  async processMessage(sessionData) {
    try {
      // eslint-disable-next-line no-unused-vars
      const assistantId = this.assistants[sessionData.stationId];

      const response = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: sessionData.conversationHistory,
        functions: this.functions,
      });

      const message = response.choices[0].message;

      if (message.function_call) {
        const functionResult = await this.handleFunctionCall(
            message.function_call,
            sessionData.stationId,
        );

        const finalResponse = await this.client.chat.completions.create({
          model: "gpt-4",
          messages: [
            ...sessionData.conversationHistory,
            message,
            {
              role: "function",
              name: message.function_call.name,
              content: JSON.stringify(functionResult),
            },
          ],
        });

        return finalResponse.choices[0].message.content;
      }

      return message.content;
    } catch (error) {
      console.error("OpenAI Error:", error);
      throw error;
    }
  }

  /**
   * Handles function calls from OpenAI.
   * @param {Object} functionCall - Function call details from OpenAI
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Object} Function execution result
   */
  async handleFunctionCall(functionCall, stationId) {
    const {name, arguments: args} = functionCall;
    const parsedArgs = JSON.parse(args);

    switch (name) {
      case "submitStory":
        return await this.submitStory(parsedArgs, stationId);
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  /**
   * Submits a news story.
   * @param {Object} params - Story submission parameters
   * @param {string} stationId - Station identifier
   * @return {Object} Submission result
   */
  async submitStory({contactInfo, storyContent}, stationId) {
    // TODO: Implement actual story submission logic
    return {
      success: true,
      message: `Story submitted successfully to ${stationId.toUpperCase()}`,
    };
  }
}

module.exports = new OpenAIManager();

