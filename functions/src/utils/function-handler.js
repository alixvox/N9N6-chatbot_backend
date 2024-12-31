/**
 * Individual function handlers for OpenAI Assistant
 * @module function-handler
 */

const admin = require("firebase-admin");
const logger = require("./logger");
const secretsManager = require("./secrets-manager");
const {formatCurrentTimeCentral} = require("./time-utils");

const db = admin.firestore();

/**
 * Gets the Firestore reference for a station's submissions collection
 * @param {string} stationId - Station identifier ('n6' or 'n9')
 * @return {FirebaseFirestore.CollectionReference} Firestore collection ref
 */
function getSubmissionsRef(stationId) {
  return db.collection(`submissions_${stationId}`);
}

/**
 * Handles submission-type functions (stories, feedback, etc)
 * @param {string} type - Type of submission
 * @param {Object} args - Function arguments from OpenAI
 * @param {string} sessionId - Session identifier
 * @param {string} userId - User identifier
 * @return {Promise<Object>} Success status
 */
async function handleSubmission(type, args, sessionId, userId) {
  try {
    const webhookUrl = await secretsManager.getSecret("ZAPIER_WEBHOOK");

    // Send to Zapier
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        ...args,
        stationId: args.stationId,
        time: formatCurrentTimeCentral("submission"),
      }),
    });

    if (!response.ok) {
      logger.error("Zapier webhook failed:", {
        status: response.status,
        type,
        sessionId,
      });
      return {success: false};
    }

    // Create submission document
    const submissionDoc = {
      type,
      content: args.description,
      zapierResponse: response.ok ? "Success" : "Failed",
      sessionId,
      userId,
      created: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    const docRef = await getSubmissionsRef(args.stationId).add(submissionDoc);

    // Log the submission
    logger.logSubmissionData({
      type,
      stationId: args.stationId,
      sessionId,
      content: args.description,
      zapierResponse: response.ok ? "Success" : "Failed",
      submissionId: docRef.id,
    });

    return {success: true};
  } catch (error) {
    logger.error("Error in handleSubmission:", {
      error: error.message,
      type,
      sessionId,
    });
    throw error;
  }
}

/**
 * Gets weather data for an Oklahoma location
 * @param {Object} args - Function arguments from OpenAI
 * @return {Promise<Object>} Weather data
 */
async function handleWeather(args) {
  try {
    const apiKey = await secretsManager.getSecret("WEATHER_API_KEY");
    const location = encodeURIComponent(args.location);

    // Get current weather
    const currentResponse = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${location}&aqi=no`,
    );

    if (!currentResponse.ok) {
      throw new Error("Weather API request failed");
    }

    const currentData = await currentResponse.json();

    const result = {
      current: {
        temp_f: currentData.current.temp_f,
        condition: currentData.current.condition.text,
        wind_mph: currentData.current.wind_mph,
        humidity: currentData.current.humidity,
      },
    };

    // Get forecast if requested
    if (args.include_forecast) {
      const forecastResponse = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${location}&days=3&aqi=no`,
      );

      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json();
        result.forecast = forecastData.forecast.forecastday.map((day) => ({
          date: day.date,
          max_temp_f: day.day.maxtemp_f,
          min_temp_f: day.day.mintemp_f,
          condition: day.day.condition.text,
        }));
      }
    }

    return result;
  } catch (error) {
    logger.error("Error getting weather data:", error);
    throw error;
  }
}

/**
 * Formats and returns a Google search URL
 * @param {Object} args - Function arguments from OpenAI
 * @return {Object} Formatted Google search URL
 */
function handleGoogleSearch(args) {
  try {
    const searchUrl = `https://www.google.com/search?q=${args.keywords.join("+")}+${args.siteUrl}`;
    return {google_url: searchUrl};
  } catch (error) {
    logger.error("Error formatting Google search:", error);
    throw error;
  }
}

/**
 * Gets current time in Central timezone
 * @param {Object} args - Function arguments from OpenAI
 * @return {Object} Formatted time
 */
function handleCurrentTime(args) {
  try {
    if (args.format === "submission") {
      return {time: formatCurrentTimeCentral("submission")};
    }
    throw new Error("Unsupported time format");
  } catch (error) {
    logger.error("Error getting current time:", error);
    throw error;
  }
}

module.exports = {
  handleSubmission,
  handleWeather,
  handleGoogleSearch,
  handleCurrentTime,
};
