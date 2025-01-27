// functions/src/webhook.js
/**
 * @file Express router configuration for Watson Assistant webhooks.
 * @module webhook
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const logger = require("./utils/logger");
const openAIManager = require("./managers/openai");
const sessionManager = require("./managers/session");

const verifyWatsonxAuth = async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth) {
      logger.error("Auth from WatsonX not available in request context");
      return res.status(500).json({error: "Server configuration error"});
    }

    const authHeader = req.headers.authorization;
    const expectedAuth = `Basic ${auth}`;

    if (!authHeader || authHeader !== expectedAuth) {
      logger.error("Invalid Authorization header", {
        hasHeader: !!authHeader,
        matches: authHeader === expectedAuth,
      });
      return res.status(401).json({error: "Unauthorized"});
    }

    next();
  } catch (error) {
    logger.error("Error verifying WatsonX webhook auth", error);
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
        context: {global: {system: {user_id: userId}}},
        input: {text: messageText},
      },
    } = req.body;

    // Return empty response for empty messages
    if (!messageText) {
      return res.json({
        output: {
          generic: [],
        },
      });
    }

    // Get or create session with all checks
    const {session, docId, status, remainingCooldown} =
        await sessionManager.getOrCreateUserSession(userId, stationId);

    // Handle cooldown period
    if (status === "cooldown") {
      const cooldownMinutes = Math.ceil(remainingCooldown / (60 * 1000));
      logger.info("User in cooldown period", {
        userId,
        stationId,
        cooldownMinutes,
      });
      return res.status(429).json({
        error: "Message limit exceeded",
        message: `Please wait ${cooldownMinutes} minutes before ` +
        `starting a new chat.`,
      });
    }

    // Check message limits
    const limitStatus = sessionManager.checkMessageLimit(session);

    // If we've reached the limit, return an error to trigger WatsonX fallback
    if (limitStatus.hasReachedLimit) {
      logger.info("User reached message limit", {
        userId,
        stationId,
        messageCount: limitStatus.count,
      });
      return res.status(429).json({
        error: "Message limit exceeded",
        message: limitStatus.warningMessage,
      });
    }

    // Add user message to session
    await sessionManager.addMessage(
        docId,
        messageText,
        "user",
        stationId,
    );

    // Get response from OpenAI manager
    let responseBody = await openAIManager.getResponseBody(
        stationId,
        docId,
        userId,
        messageText,
    );

    // Add warning message if approaching limit
    if (limitStatus.warningMessage) {
      responseBody = responseBody + limitStatus.warningMessage;
    }

    // Add assistant response to session
    await sessionManager.addMessage(
        docId,
        responseBody,
        "assistant",
        stationId,
    );

    logger.info("Final response to WatsonX", {
      responseBody,
      messageCount: limitStatus.count,
      fullResponse: {
        output: {
          generic: [{
            response_type: "text",
            text: responseBody,
          }],
        },
      },
    });

    // Set Watson header and send response
    res.set("X-Watson-Assistant-Webhook-Return", "true");
    return res.json({
      output: {
        generic: [{
          response_type: "text",
          text: responseBody,
        }],
      },
    });
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
router.post("/n9", verifyWatsonxAuth, async (req, res) => {
  await handleWebhookResponse(req, res, "n9");
});

// N6 chatbot endpoint
router.post("/n6", verifyWatsonxAuth, async (req, res) => {
  await handleWebhookResponse(req, res, "n6");
});

// Development-only route to view logs
router.get("/logs", (req, res) => {
  const logs = logger.getSessionsLog();
  res.type("text/plain").send(logs);
});

module.exports = router;
