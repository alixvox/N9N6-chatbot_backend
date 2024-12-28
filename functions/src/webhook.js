/**
 * Express router configuration for Watson Assistant webhooks.
 * @module webhook
 */

const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const sessionManager = require("./utils/session");
const logger = require("./utils/logger");

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

    // Always create/get session first
    await sessionManager.getOrCreateSession(
        sessionId,
        userId,
        stationId,
    );

    if (!messageText) {
      const welcomeMessage = [
        `Hi! I'm Newsy, your ${stationName} chatbot assistant.`,
        "How can I help you today?",
      ].join(" ");

      // Now update session with welcome message
      await sessionManager.updateSession(
          sessionId,
          welcomeMessage,
          "assistant",
          stationId, // Make sure to pass stationId here
      );

      const responseBody = {
        output: {
          generic: [{
            response_type: "text",
            text: welcomeMessage,
          }],
        },
      };

      res.set("X-Watson-Assistant-Webhook-Return", "true");
      return res.json(responseBody);
    }

    // Handle non-empty messages
    await sessionManager.updateSession(
        sessionId, messageText, "user", stationId);

    const responseText = "Message received! OpenAI integration coming soon.";
    const responseBody = {
      output: {
        generic: [{
          response_type: "text",
          text: responseText,
        }],
      },
    };

    await sessionManager.updateSession(
        sessionId,
        responseText,
        "assistant",
        stationId,
    );

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
