// functions/src/utils/time-utils.js
/**
 * @file Utility functions for time formatting
 * @module time-utils
 */
/**
 * Formats current time to Central Time with specified format
 * @param {string} format - Format type ('session' or 'submission')
 * @return {string} Formatted time string
 */
function formatCurrentTimeCentral(format) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: format === "submission" ? "numeric" : "2-digit",
    month: format === "submission" ? "long" : "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(now);

  // Create a safe document ID for sessions
  if (format === "session") {
    const month = parts.find((p) => p.type === "month").value;
    const day = parts.find((p) => p.type === "day").value;
    const year = parts.find((p) => p.type === "year").value;
    const hour = parts.find((p) => p.type === "hour").value;
    const minute = parts.find((p) => p.type === "minute").value;
    const second = parts.find((p) => p.type === "second").value;
    const dayPeriod = parts.find((p) => p.type === "dayPeriod").value;

    const date = `${month}-${day}-${year}`;
    const time = `${hour}-${minute}-${second}-${dayPeriod}`;

    return `${date}_${time}`;
  }

  // Regular format for submissions
  return parts
      .map(({type, value}) => value)
      .join("")
      .replace(",", "");
}

module.exports = {
  formatCurrentTimeCentral,
};
