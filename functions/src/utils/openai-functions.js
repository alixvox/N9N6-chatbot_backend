/**
 * OpenAI function definitions for the chatbot
 * @module openai-functions
 */

/**
 * Function definition for story submission
 * @type {Object}
 *  */
const submitStoryFunction = {
  name: "submit_story",
  description: "Submit a story idea or news tip to the news team",
  parameters: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "Detailed description of the story or tip, " +
        "including any relevant contact information and location if provided",
      },
      timestamp: {
        type: "string",
        description: "The exact time the submission is made",
      },
      stationId: {
        type: "string",
        enum: ["n6", "n9"],
        description: "The station identifier",
      },
    },
    required: ["description", "timestamp", "stationId"],
    additionalProperties: false,
  },
};

// Export individual functions and the complete list
module.exports = {
  submitStory: submitStoryFunction,
  getAllFunctions: () => [submitStoryFunction],
};
