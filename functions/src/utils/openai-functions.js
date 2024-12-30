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
        stationId: {
          type: "string",
          enum: ["n6", "n9"],
          description: "The station identifier",
        },
        type: {
          type: "string",
          enum: ["story"],
        },
      },
      required: ["description", "stationId", "type"],
      additionalProperties: false,
    },
  },
};

/**
 * Function definition for feedback submission to digital team
 * @type {Object}
 *  */
const submitFeedbackDigitalFunction = {
  type: "function",
  function: {
    name: "submit_feedback_digital",
    description: "Submit feedback for a story or content hosted on the " +
    "website or app, not including feedback for the broadcast/livestream " +
    "content",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the feedback, " +
          "including any relevant contact information if provided upon request",
        },
        stationId: {
          type: "string",
          enum: ["n6", "n9"],
          description: "The station identifier",
        },
        type: {
          type: "string",
          enum: ["digital feedback"],
        },
      },
      required: ["description", "stationId", "type"],
      additionalProperties: false,
    },
  },
};

/**
 * Function definition for feedback submission to broadcast team
 * @type {Object}
 *  */
const submitFeedbackBroadcastFunction = {
  type: "function",
  function: {
    name: "submit_feedback",
    description: "Submit feedback for the news producers, editors, talent, " +
    "etc in regards to the broadcast or livestream content",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the feedback, " +
          "including any relevant contact information if provided upon request",
        },
        stationId: {
          type: "string",
          enum: ["n6", "n9"],
          description: "The station identifier",
        },
        type: {
          type: "string",
          enum: ["broadcast feedback"],
        },
      },
      required: ["description", "stationId", "type"],
      additionalProperties: false,
    },
  },
};

/**
 * Function definition for technical/bug report
 * @type {Object}
 *  */
const submitTechnicalDigitalFunciton = {
  type: "function",
  function: {
    name: "submit_technical_digital",
    description: "Submit a technical issue or bug report of the website or " +
    "app to the development team, not including feedback for the broadcast/" +
    "livestream content",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the technical issue or bug, " +
          "including the access point, device, date/time of occurrence, and " +
          "any relevant contact information if provided upon request",
        },
        stationId: {
          type: "string",
          enum: ["n6", "n9"],
          description: "The station identifier",
        },
        type: {
          type: "string",
          enum: ["digital technical"],
        },
      },
      required: ["description", "stationId", "type"],
      additionalProperties: false,
    },
  },
};

/**
 * Function definition for technical/bug report
 * @type {Object}
 *  */
const submitTechnicalBroadcastFunciton = {
  type: "function",
  function: {
    name: "submit_technical_broadcast",
    description: "Submit a technical issue or bug report of the broadcast " +
    "or livestream to the engineering team",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the technical issue or bug, " +
          "including the access point, device, date/time of occurrence, and " +
          "any relevant contact information if provided upon request",
        },
        stationId: {
          type: "string",
          enum: ["n6", "n9"],
          description: "The station identifier",
        },
        type: {
          type: "string",
          enum: ["broadcast technical"],
        },
      },
      required: ["description", "stationId", "type"],
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
        stationId: {
          type: "string",
          enum: ["n6", "n9"],
          description: "The station identifier",
        },
        type: {
          type: "string",
          enum: ["advertising"],
        },
      },
      required: ["description", "stationId", "type"],
      additionalProperties: false,
    },
  },
};

// Export individual functions and the complete list
module.exports = {
  submitStory: submitStoryFunction,
  submitFeedbackDigital: submitFeedbackDigitalFunction,
  submitFeedbackBroadcast: submitFeedbackBroadcastFunction,
  submitTechnicalDigital: submitTechnicalDigitalFunciton,
  submitTechnicalBroadcast: submitTechnicalBroadcastFunciton,
  submitAdvertising: submitAdvertisingFunction,
  getAllFunctions: () => [
    submitStoryFunction,
    submitFeedbackDigitalFunction,
    submitFeedbackBroadcastFunction,
    submitTechnicalDigitalFunciton,
    submitTechnicalBroadcastFunciton,
    submitAdvertisingFunction],
};
