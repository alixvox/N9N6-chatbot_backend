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

  if (format === "submission") {
    // Submission display format: "January 01, 2025 at 1:03:25 PM"
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const parts = formatter.formatToParts(now);
    const values = {};
    parts.forEach(({type, value}) => {
      values[type] = value;
    });

    return `${values.month} ${values.day}, ${values.year} at ${values.hour}:` +
           `${values.minute}:${values.second} ${values.dayPeriod}`;
  }

  // Session format (and submission doc naming): "01-01-25 at 13:03 PM"
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(now);
  const values = {};
  parts.forEach(({type, value}) => {
    values[type] = value;
  });

  // Convert to 24-hour format
  let hour24 = parseInt(values.hour);
  if (values.dayPeriod === "PM" && hour24 !== 12) {
    hour24 += 12;
  } else if (values.dayPeriod === "AM" && hour24 === 12) {
    hour24 = 0;
  }
  const hour24Str = String(hour24).padStart(2, "0");

  return `${values.month}-${values.day}-${values.year} at ${hour24Str}-` +
         `${values.minute} ${values.dayPeriod}`;
}

module.exports = {
  formatCurrentTimeCentral,
};
