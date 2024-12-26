const express = require('express');
const router = express.Router();

// Add secret validation middleware
const validateSecret = (req, res, next) => {
  const secret = req.headers['authorization'];
  if (secret !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.post('/', async (req, res) => {
  try {
    // Log incoming request
    console.log('Received webhook request:');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const responseBody = {
      output: {
        generic: [
          {
            response_type: "text",
            text: "Processed Message"
          }
        ]
      }
    };

    // Set the header explicitly
    res.set('X-Watson-Assistant-Webhook-Return', 'true');
    // Set content type explicitly
    res.set('Content-Type', 'application/json');
    // Send the response
    return res.json(responseBody);

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;