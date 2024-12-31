# N9N6 Chatbot Backend

A Firebase-based middleware server that handles chatbot interactions between WatsonX Assistant for News 9 (OKC) and News 6 (Tulsa) websites, integrating with OpenAI's Assistants API for intelligent responses and function execution.

## Project Structure

```
.
├── .firebaserc              # Firebase project configuration
├── .github/                 # GitHub configurations
│   └── workflows/
│       └── firebase-deploy.yml  # CI/CD deployment workflow
├── data/                   # System instructions and function data
│   └── funciton-defs/      # JSON schema for all functions
│   └── n6-instructions.txt      # Instructions for News on 6 assistant
│   └── n9-instructions.txt      # Instructions for News 9 assistant
├── firebase.json           # Firebase service configurations
├── firestore.indexes.json  # Firestore index configurations
├── firestore.rules         # Firestore security rules
├── functions/             # Firebase Functions directory
│   ├── config/            # Firebase configuration files
│   │   └── n9n6-chatbot-backend-firebase-adminsdk-key.json
│   ├── src/
│   │   ├── utils/        # Utility modules
│   │   │   ├── error-manager.js    # Error handling middleware
│   │   │   ├── logger.js           # Firebase structured logging utilities
│   │   │   ├── openai-manager.js   # OpenAI Assistants API integration
│   │   │   ├── secrets-manager.js  # Google Cloud Secret Manager utility
│   │   │   ├── session-manager.js  # Session management in Firestore
│   │   │   └── function-manager.js # Function execution handling
│   │   └── webhook.js    # Main webhook routes
│   ├── .env              # Environment variables (local development)
│   ├── .env.example      # Example environment variables
│   ├── app.js           # Express app configuration
│   └── index.js         # Firebase Functions entry point
└── README.md            # Project documentation
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
6. Calls Function manager if a function call is needed
7. Returns response to WatsonX Assistant

### OpenAI Integration (src/utils/)

#### openai-manager.js

Defines available functions for OpenAI to call:

- Manages OpenAI Assistants API interaction
- Creates and manages threads for conversations
- Handles message processing and response parsing
- Coordinates function execution through function manager
- Maintains conversation context and history
- Polls for completion of assistant tasks
- Processes and validates assistant responses

#### function-manager.js

Manages function execution:

- Handles various user queries:
  - Story submissions
  - Feedback collection
  - Technical support inquiries
  - Advertising requests
  - General information queries
- Routes function calls to appropriate handlers
- Calls Zapier webhooks for submissions
- Validates function inputs and outputs

### Session Management (src/utils/session-manager.js)

Manages chat sessions using Firebase Firestore:

- Separate collections for N9 and N6 sessions
- No in-memory caching (serverless architecture)
- Daily automated cleanup of old sessions
- Station-specific system prompts
- Message history tracking

### Logging (src/utils/logger.js)

Structured logging through Firebase:

- Session activity logging
- Function logging
- Error logging
- Development logs accessible through Google Cloud Console

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

- `WATSONX_AUTH`: WatsonX webhook authentication
- `ZAPIER_WEBHOOK`: Story submission webhook URL
- `OPENAI_SERVICE_API_KEY`: OpenAI API authentication
- `N6_ASSISTANT_ID`: News ON 6 OpenAI Assistant ID
- `N6_ASSISTANT_ID`: News ON 6 OpenAI Assistant ID

## Data Flow

1. **Incoming Request (WatsonX Assistant → Webhook)**
   - WatsonX Assistant sends message to appropriate station endpoint
   - Webhook verifies secret and extracts session info/message
2. **Session Management**
   - Create/update session in Firestore
   - Create OpenAI thread if needed
   - Update message history
3. **OpenAI Processing**
   - Send message to OpenAI Assistant
   - Handle any function calls through function manager
   - Parse and validate assistant response
4. **Response**
   - Store assistant response in session
   - Format response for WatsonX
   - Send formatted response back to WatsonX Assistant

## Functions

The chatbot system supports multiple function types that allow the Assistant to perform specific actions in response to user requests. These functions are managed through the function-manager.js utility and are available to the OpenAI Assistant through function definitions.

### Core Function Types

1. **Submission Functions (handled in handleSubmission)**
   - Store submission in Firestore
   - Send data to Zapier webhook
   - Log submission details
   - Return success/failure status
     Specific submission functions:
   - submit_story: Process story ideas and coverage requests
   - submit_digital_feedback: Handle website and app feedback
   - submit_broadcast_feedback: Manage TV broadcast and content feedback
   - submit_digital_technical: Process website/app technical issues
   - submit_broadcast_technical: Handle broadcast/streaming technical problems
   - submit_advertising: Process advertising inquiries
2. **Utility Functions**
   - format_google_search: Creates targeted search URLs for finding specific content

### Function Workflow

1. Assistant determines function need based on user interaction
2. Function call is routed through openai-manager.js
3. function-manager.js executes appropriate handler
4. Results are returned to Assistant for response formulation

## Environment Variables

Required in `functions/.env` for local development:

```
WEBHOOK_SECRET=your_webhook_secret
OPENAI_SERVICE_API_KEY=your_openai_key
N6_ASSISTANT_ID=your_n6_assistant_id
N9_ASSISTANT_ID=your_n9_assistant_id
```

Production environment uses Google Cloud Secret Manager.
