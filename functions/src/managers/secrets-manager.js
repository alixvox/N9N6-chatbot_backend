// functions/src/utils/secrets-manager.js
/**
 * @file Centralized secret management utility
 * @module secrets-manager
 */

const {SecretManagerServiceClient} = require("@google-cloud/secret-manager");
const logger = require("../utils/logger");

// Initialize Secret Manager client once
const secretClient = new SecretManagerServiceClient();

/**
 * @class SecretsManager
 * @description Manages access to Google Cloud Secret Manager secrets
 */
class SecretsManager {
  /**
   * Retrieves the latest version of a secret
   * @param {string} secretName - Name of the secret to retrieve
   * @return {Promise<string>} The secret value
   */
  async getSecret(secretName) {
    try {
      const secretPath = [
        "projects",
        "n9n6-chatbot-backend",
        "secrets",
        secretName,
        "versions",
        "latest",
      ].join("/");

      const [version] = await secretClient.accessSecretVersion({
        name: secretPath,
      });

      return version.payload.data.toString("utf8");
    } catch (error) {
      logger.error(`Error accessing secret ${secretName}:`, error);
      throw error;
    }
  }
}

module.exports = new SecretsManager();
