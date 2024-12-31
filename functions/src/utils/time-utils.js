/**
 * Utility functions for time formatting
 * @module time-utils
 */
/**
 * Formats current time to Central Time with specified format
 * @param {string} format - Format type ('session' or 'submission')
 * @return {string} Formatted time string
 */
function formatCurrentTimeCentral(format) {
  const options = {
    timeZone: "America/Chicago",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };

  if (format === "session") {
    options.year = "numeric";
    options.month = "long";
  }

  const centralTime = new Date().toLocaleString("en-US", options);

  if (format === "submission") {
    // Format: "11/29/24 at 4:59:10 PM"
    return centralTime
        .replace(",", "")
        .replace(" ", " at ");
  }

  // Submission format remains unchanged
  return centralTime.replace(" at ", " at ").replace(",", "");
}

module.exports = {
  formatCurrentTimeCentral,
};
