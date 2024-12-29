/**
 * Express router configuration for Watson Assistant webhooks.
 * @module webhook
 */

const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const sessionManager = require("./utils/session-manager");
const logger = require("./utils/logger");
const openAIManager = require("./openai-manager");

const verifyWebhookSecret = async (req, res, next) => {
  try {
    const secret = req.webhookSecret;
    if (!secret) {
      logger.error("WEBHOOK_SECRET not available in request context");
      return res.status(500).json({error: "Server configuration error"});
    }

    const authHeader = req.headers.authorization;
    const expectedAuth = `Basic ${secret}`;

    if (!authHeader || authHeader !== expectedAuth) {
      logger.error("Invalid Authorization header", {
        hasHeader: !!authHeader,
        matches: authHeader === expectedAuth,
      });
      return res.status(401).json({error: "Unauthorized"});
    }

    next();
  } catch (error) {
    logger.error("Error verifying webhook secret", error);
    return res.status(500).json({error: "Internal server error"});
  }
};

/**
 * Handles the webhook response for both N9 and N6 chatbots
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} stationId - Station identifier ('n9' or 'n6')
 */
const handleWebhookResponse = async (req, res, stationId) => {
  try {
    const {
      payload: {
        context: {global: {session_id: sessionId, system: {user_id: userId}}},
        input: {text: messageText},
      },
    } = req.body;

    const stationName = stationId === "n6" ? "News on 6" : "News 9";

    if (!messageText) {
      const welcomeMessage = [
        `Hi! I’m Newsy, an AI assistant for ${stationName}.`,
        "How can I help you today?",
      ].join(" ");

      // Pass session data to avoid another read
      await sessionManager.updateSession(
          sessionId,
          welcomeMessage,
          "assistant",
          stationId,
      );

      return res.json({
        output: {
          generic: [{
            response_type: "text",
            text: welcomeMessage,
          }],
        },
      });
    }

    // Handle non-empty messages - pass session data to avoid reads
    await sessionManager.updateSession(
        sessionId,
        messageText,
        "user",
        stationId,
    );

    // Get response from OpenAI manager
    const responseBody = await openAIManager.getResponseBody(
        messageText,
        stationId,
        sessionId,
        userId,
    );

    // Update session with assistant's response
    await sessionManager.updateSession(
        sessionId,
        responseBody.output.generic[0].text,
        "assistant",
        stationId,
    );

    // Set Watson header and send response
    res.set("X-Watson-Assistant-Webhook-Return", "true");
    return res.json(responseBody);
  } catch (error) {
    logger.error("Webhook Error:", {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    res.status(500).json({error: "Internal Server Error"});
  }
};

// N9 chatbot endpoint
router.post("/n9", verifyWebhookSecret, async (req, res) => {
  await handleWebhookResponse(req, res, "n9");
});

// N6 chatbot endpoint
router.post("/n6", verifyWebhookSecret, async (req, res) => {
  await handleWebhookResponse(req, res, "n6");
});

// Development-only route to view logs
router.get("/logs", (req, res) => {
  const logs = logger.getSessionsLog();
  res.type("text/plain").send(logs);
});

module.exports = router;
