/**
 * OpenAI function definitions for the chatbot
 * @module openai-functions
 */

/**
 * Function definition for story submission
 * @type {Object}
 *  */
const submitStoryFunction = {
  type: "function",
  function: {
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
  },
};

/**
 * Function definition for feedback submission
 * @type {Object}
 *  */
const submitFeedbackFunction = {
  type: "function",
  function: {
    name: "submit_feedback",
    description: "Submit feedback for the news producers, editors, talent, " +
    "etc.",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the feedback, " +
          "including any relevant contact information if provided upon request",
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
  },
};

/**
 * Function definition for technical/bug report
 * @type {Object}
 *  */
const submitTechnicalFunciton = {
  type: "function",
  function: {
    name: "submit_feedback",
    description: "Submit a technical issue or bug report to the " +
    "development team",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the technical issue or bug, " +
          "including the access point, device, date/time of occurrence, and " +
          "any relevant contact information if provided upon request",
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
  },
};

/**
 * Function definition for advertising request
 * @type {Object}
 *  */
const submitAdvertisingFunction = {
  type: "function",
  function: {
    name: "submit_advertising",
    description: "Submit a request for advertising or sponsor opportunities",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the advertising or sponsor " +
          "request, requiring contact name and email, company name, and any " +
          "specific details or requirements for the request",
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
  },
};

// Export individual functions and the complete list
module.exports = {
  submitStory: submitStoryFunction,
  getAllFunctions: () => [
    submitStoryFunction,
    submitFeedbackFunction,
    submitTechnicalFunciton,
    submitAdvertisingFunction],
};
