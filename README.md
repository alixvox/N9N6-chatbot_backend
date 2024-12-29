# N9N6 Chatbot Backend

A Firebase-based middleware server that handles chatbot interactions between WatsonX Assistant for News 9 (OKC) and News on 6 (Tulsa) websites, with OpenAI function integration for handling user submissions.

## Project Structure

```
.
├── .firebaserc              # Firebase project configuration
├── .github/                 # GitHub configurations
│   └── workflows/
│       └── firebase-deploy.yml  # CI/CD deployment workflow
├── firebase.json            # Firebase service configurations
├── firestore.indexes.json   # Firestore index configurations
├── firestore.rules          # Firestore security rules
├── functions/               # Firebase Functions directory
│   ├── config/             # Firebase configuration files
│   │   └── n9n6-chatbot-backend-firebase-adminsdk-key.json
│   ├── src/
│   │   ├── utils/         # Utility modules
│   │   │   ├── error-manager.js     # Error handling middleware
│   │   │   ├── logger.js            # Firebase structured logging utilities
│   │   │   ├── openai-functions.js  # OpenAI function definitions
│   │   │   ├── openai-manager.js    # OpenAI integration handler
│   │   │   ├── secrets-manager.js   # Google Cloud Secret Manager utility
│   │   │   ├── session-manager.js   # Session management in Firestore
│   │   │   └── submission-manager.js # Submission handling and storage
│   │   └── webhook.js     # Main webhook routes
│   ├── .env               # Environment variables (local development)
│   ├── .env.example       # Example environment variables
│   ├── app.js            # Express app configuration
│   └── index.js          # Firebase Functions entry point
└── README.md             # Project documentation
```

## Core Components

### Entry Points (functions/)

#### index.js

- Firebase Functions entry point
- Initializes Firebase Admin SDK
- Exports the Express app as a Firebase Function
- Handles webhook secret retrieval via Secrets Manager
- Implements daily scheduled session cleanup

### Webhook Handler (src/webhook.js)

Handles incoming requests from WatsonX Assistant for both N9 and N6 chatbots.

Endpoints:

- `/webhook/n9`: News 9 (OKC) chatbot endpoint
- `/webhook/n6`: News on 6 (Tulsa) chatbot endpoint
- `/webhook/logs`: Development endpoint for viewing Firebase logs info

Request Flow:

1. Receives request from WatsonX Assistant
2. Verifies webhook secret
3. Extracts session information and message
4. Creates/updates session in Firestore
5. Processes through OpenAI manager
6. Returns response to WatsonX Assistant

### OpenAI Integration (src/utils/)

#### openai-functions.js

Defines available functions for OpenAI to call:

- Story submission function
- (Future) Feedback submission
- (Future) Advertising inquiry
- (Future) Technical issue report

#### openai-manager.js

Handles OpenAI interaction:

- Formats session data for OpenAI
- Processes messages (currently mocked)
- Handles function calls through submission manager
- Returns formatted responses for WatsonX

#### submission-manager.js

Manages submission handling:

- Routes function calls to appropriate handlers
- Sends data to Zapier webhooks
- Stores submissions in Firestore
- Provides response text for user feedback

### Session Management (src/utils/session-manager.js)

Manages chat sessions using Firebase Firestore:

- Separate collections for N9 and N6 sessions
- No in-memory caching (serverless architecture)
- Daily automated cleanup of old sessions
- Station-specific system prompts

### Logging (src/utils/logger.js)

Structured logging through Firebase:

- Session activity logging
- Submission logging
- Error logging
- Development logs accessible through Firebase Console

## Firebase Configuration

The project uses several Firebase services:

1. **Firebase Functions**

   - Hosts the middleware server
   - Handles webhook endpoints
   - Implements daily scheduled cleanup

2. **Firestore**

   - Collections:
     - `sessions_n9`: News 9 chat sessions
     - `sessions_n6`: News on 6 chat sessions
     - `submissions_n9`: News 9 user submissions
     - `submissions_n6`: News 6 user submissions

   Session Document Structure:

   ```javascript
   {
     sessionId: string,
     userId: string,
     stationId: "n9" | "n6",
     conversationHistory: Array<{
       role: "system" | "user" | "assistant",
       content: string
     }>,
     lastActivity: timestamp
   }
   ```

   Submission Document Structure:

   ```javascript
   {
     type: string,
     content: string,
     timestamp: timestamp,
     zapierResponse: "Success" | "Failed",
     sessionId: string,
     userId: string,
     created: timestamp,
     conversationRef: {
       sessionId: string,
       timestamp: string
     }
   }
   ```

3. **Firestore**

   - Runs daily at midnight (America/Chicago timezone)
   - Cleans up sessions inactive for more than 1 hour

## Secrets Management

Using Google Cloud Secret Manager for:

- `WEBHOOK_SECRET`: WatsonX webhook authentication
- `ZAPIER_STORY`: Story submission webhook URL
- (Future) Additional Zapier webhook URLs

## Data Flow

1. **Incoming Request (WatsonX Assistant → Webhook)**
   - WatsonX Assistant sends message to appropriate station endpoint
   - Webhook verifies secret and extracts session info/message
2. **Session Management**
   - Create/update session in Firestore
   - Format conversation history for OpenAI
3. **OpenAI Processing**
   - Send formatted session to OpenAI (currently mocked)
   - Handle function calls if present
   - Process submissions through Zapier
4. **Response**
   - Update session with response
   - Send formatted response back to WatsonX Assistant

## Environment Variables

Required in `functions/.env` for local development:

```
WEBHOOK_SECRET=your_webhook_secret
ZAPIER_STORY=your_zapier_webhook_url
```

Production environment uses Google Cloud Secret Manager.
