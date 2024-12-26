const express = require('express');
const router = express.Router();
const sessionManager = require('./utils/session');
const logger = require('./utils/logger');

router.post('/', async (req, res) => {
  try {
    const sessionId = req.body.payload.context.global.session_id;
    const userId = req.body.payload.context.global.system.user_id;
    const messageText = req.body.payload.input.text;
    
    const pageUrl = req.body.payload.context.integrations.chat.browser_info.page_url;
    const stationId = pageUrl.includes('tulsa') ? 'TULSA' : 'OKC';

    if (!messageText) {
      const welcomeMessage = `Hi! I'm Newsy, your ${stationId} chatbot assistant. How can I help you today?`;
      const responseBody = {
        output: {
          generic: [{
            response_type: "text",
            text: welcomeMessage
          }]
        }
      };
      
      await sessionManager.getOrCreateSession(sessionId, userId, stationId);
      await sessionManager.updateSession(sessionId, welcomeMessage, 'assistant');
      
      res.set('X-Watson-Assistant-Webhook-Return', 'true');
      return res.json(responseBody);
    }

    const session = await sessionManager.getOrCreateSession(sessionId, userId, stationId);
    await sessionManager.updateSession(sessionId, messageText, 'user');

    const responseText = "Message received! OpenAI integration coming soon.";
    const responseBody = {
      output: {
        generic: [{
          response_type: "text",
          text: responseText
        }]
      }
    };

    await sessionManager.updateSession(sessionId, responseText, 'assistant');

    res.set('X-Watson-Assistant-Webhook-Return', 'true');
    return res.json(responseBody);

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Development-only route to view logs
router.get('/logs', (req, res) => {
  const logs = logger.getSessionsLog();
  res.type('text/plain').send(logs);
});

module.exports = router;
