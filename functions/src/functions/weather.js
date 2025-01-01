// functions/src/functions/weather.js
/**
 * @file Weather-related functions for the assistant
 * @module functions/weather
 */

const logger = require("../utils/logger");
const secretsManager = require("../utils/secrets-manager");

/**
 * Gets weather data for a location
 * @param {Object} args - Function arguments from OpenAI
 * @return {Promise<Object>} Weather data
 */
async function getWeather(args) {
  try {
    const apiKey = await secretsManager.getSecret("WEATHER_API_KEY");
    const location = encodeURIComponent(args.location);

    const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${location}&days=3&aqi=no`,
    );

    if (!response.ok) {
      throw new Error("Weather API request failed");
    }

    const data = await response.json();

    return {
      current: {
        temp_f: data.current.temp_f,
        feels_like_f: data.current.feelslike_f,
        condition: data.current.condition.text,
        wind_mph: data.current.wind_mph,
        wind_dir: data.current.wind_dir,
        humidity: data.current.humidity,
        precip_in: data.current.precip_in,
        last_updated: data.current.last_updated,
      },
      forecast: data.forecast.forecastday.map((day) => ({
        date: day.date,
        max_temp_f: day.day.maxtemp_f,
        min_temp_f: day.day.mintemp_f,
        condition: day.day.condition.text,
        chance_of_rain: day.day.daily_chance_of_rain,
        total_precip_in: day.day.totalprecip_in,
        max_wind_mph: day.day.maxwind_mph,
      })),
    };
  } catch (error) {
    logger.error("Error getting weather data:", error);
    throw error;
  }
}

module.exports = {
  getWeather,
};

