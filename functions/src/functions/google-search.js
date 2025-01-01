// functions/src/functions/google-search.js
/**
 * @file Google search-related functions for the assistant
 * @module functions/googleSearch
 */

const logger = require("../utils/logger");

/**
 * Formats and returns a Google search URL
 * @param {Object} args - Function arguments from OpenAI
 * @return {Object} Formatted Google search URL
 */
function handleGoogleSearch(args) {
  try {
    const searchUrl = `https://www.google.com/search?q=${args.keywords.join(
        "+",
    )}+${args.siteUrl}`;
    return {google_url: searchUrl};
  } catch (error) {
    logger.error("Error formatting Google search:", error);
    throw error;
  }
}

module.exports = {
  handleGoogleSearch,
};
