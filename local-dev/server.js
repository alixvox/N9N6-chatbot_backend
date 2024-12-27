/**
 * Standalone development server.
 * Alternative to Firebase Functions for local development or if
 * Firebase becomes unavailable.
 * @module server
 */

require("dotenv").config({ path: "../functions/.env" });
const app = require("../functions/app");
const logger = require("../functions/src/utils/logger");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Standalone server running on port ${PORT}`);
});
