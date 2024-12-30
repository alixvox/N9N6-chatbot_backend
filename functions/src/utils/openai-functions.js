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
    strict: true,
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
          description: "The station identifier. Use the station you " +
          "associate with: n6 for News on 6, n9 for News 9.",
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
const submitDigitalFeedbackFunction = {
  type: "function",
  function: {
    name: "submit_digital_feedback",
    strict: true,
    description: "Submit feedback for a story or content hosted on the " +
    "website or app, not including feedback for the broadcast/livestream " +
    "content. This can include feedback suggestions for features such as " +
    "website & search functionality, the chatbot assistant (you), etc",
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
          description: "The station identifier. Use the station you " +
          "associate with: n6 for News on 6, n9 for News 9.",
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
const submitBroadcastFeedbackFunction = {
  type: "function",
  function: {
    name: "submit_broadcast_feedback",
    strict: true,
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
          description: "The station identifier. Use the station you " +
          "associate with: n6 for News on 6, n9 for News 9.",
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
const submitDigitalTechnicalFunciton = {
  type: "function",
  function: {
    name: "submit_digital_technical",
    strict: true,
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
          description: "The station identifier. Use the station you " +
          "associate with: n6 for News on 6, n9 for News 9.",
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
const submitBroadcastTechnicalFunciton = {
  type: "function",
  function: {
    name: "submit_broadcast_technical",
    strict: true,
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
          description: "The station identifier. Use the station you " +
          "associate with: n6 for News on 6, n9 for News 9.",
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
    strict: true,
    description: "Submit a request for advertising or sponsor opportunities",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the advertising or sponsor " +
          "request, this requires contact name, email, phone, and company " +
          "name, and can include any specific details or requirements for " +
          "the request",
        },
        stationId: {
          type: "string",
          enum: ["n6", "n9"],
          description: "The station identifier. Use the station you " +
          "associate with: n6 for News on 6, n9 for News 9.",
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

/**
 * Function definition for Google search link formatting
 * @type {Object}
 */
const formatGoogleSearchFunction = {
  type: "function",
  function: {
    name: "format_google_search",
    description: "Format a Google search URL to help users find specific " +
    "stories on the station website.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        keywords: {
          type: "array",
          items: {type: "string"},
          description: "Keywords for the search query, ordered by importance " +
          "(most important first). For example, ['tulsa', 'weather']",
        },
        siteUrl: {
          type: "string",
          enum: ["newson6.com", "news9.com"],
          description: "The website to restrict the search to. Use the " +
          "website you are associated with.",
        },
      },
      required: ["keywords", "siteUrl"],
      additionalProperties: false,
    },
  },
};

// Export individual functions and the complete list
module.exports = {
  submitStory: submitStoryFunction,
  submitDigitalFeedback: submitDigitalFeedbackFunction,
  submitBroadcastFeedback: submitBroadcastFeedbackFunction,
  submitDigitalTechnical: submitDigitalTechnicalFunciton,
  submitBroadcastTechnical: submitBroadcastTechnicalFunciton,
  submitAdvertising: submitAdvertisingFunction,
  formatGoogleSearch: formatGoogleSearchFunction,
  getAllFunctions: () => [
    submitStoryFunction,
    submitDigitalFeedbackFunction,
    submitBroadcastFeedbackFunction,
    submitDigitalTechnicalFunciton,
    submitBroadcastTechnicalFunciton,
    submitAdvertisingFunction,
    formatGoogleSearchFunction,
  ],
};
