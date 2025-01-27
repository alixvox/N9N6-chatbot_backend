# N9N6 Chatbot Backend

A Firebase-based middleware server that handles chatbot interactions between WatsonX Assistant for News 9 (OKC) and News 6 (Tulsa) websites, integrating with OpenAI's Assistants API for intelligent responses and function execution.

## Project Structure

```
.
├── .firebaserc                # Firebase project configuration
├── .github/                   # GitHub configurations
│   └── workflows/
│       └── firebase-deploy.yml  # CI/CD deployment workflow
├── data/                      # System data
│   ├── function-defs/         # JSON schema for functions
│   ├── n6-instructions.txt    # News 6 assistant instructions
│   └── n9-instructions.txt    # News 9 assistant instructions
├── firebase.json             # Firebase service configurations
├── firestore.indexes.json    # Firestore index configurations
├── firestore.rules           # Firestore security rules
├── functions/               # Firebase Functions directory
│   ├── config/             # Firebase configuration
│   │   └── n9n6-chatbot-backend-firebase-adminsdk-key.json
│   ├── src/               # Source code
│   │   ├── functions/     # Function implementations
│   │   │   ├── document-search.js    # Document assistant search
│   │   │   ├── submission.js         # Form submissions
│   │   │   └── weather.js            # Weather data
│   │   ├── managers/     # State and operation managers
│   │   │   ├── cleanup.js            # Session/submission cleanup
│   │   │   ├── function.js           # Function execution routing
│   │   │   ├── openai.js             # OpenAI API integration
│   │   │   ├── secrets.js            # Secret management
│   │   │   ├── session.js            # Session state management
│   │   │   └── vector-store.js       # Vector store operations
│   │   ├── utils/        # Helper utilities
│   │   │   ├── error.js              # Error middleware
│   │   │   ├── logger.js             # Logging utilities
│   │   │   └── time.js               # Time formatting
│   │   └── webhook.js    # Main webhook routes
│   ├── .env              # Local environment variables
│   ├── .env.example      # Example environment variables
│   ├── app.js           # Express app configuration
│   └── index.js         # Firebase Functions entry
└── README.md           # Project documentation
```

## Data Flow

1. **Incoming Request (WatsonX Assistant → Webhook)**
   - WatsonX Assistant sends message to appropriate station endpoint
   - Webhook verifies secret and extracts session info/message
2. **Session Management**
   - Create/retrieve session based on userId with timestamp-based ID
   - Sessions expire after 3 hours of inactivity
   - Limited to 20 assistant messages per session
   - Provides warning messages at 18th, 19th, and 20th messages
   - After 20 messages or 3-hour expiry, creates new session for user3. **OpenAI Processing**
   - Send message to OpenAI Assistant
   - Handle any function calls through function manager
   - Parse and validate assistant response
3. **Response**
   - Store assistant response in session
   - Format response for WatsonX
   - Send formatted response back to WatsonX Assistant

## Core Components

### Entry Points (functions/)

#### index.js

- Firebase Functions entry point
- Initializes Firebase Admin SDK
- Exports HTTP endpoints and scheduled functions
- Handles vector store optimization on cold starts
- Implements weekly cleanup for sessions and submissions

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

### Function Logic (src/functions/)

#### document-search.js

- Handles document assistant search queries
- Manages OpenAI vector store integration
- Processes and returns relevant document excerpts

#### submission.js

- Processes various types of user submissions
- Integrates with Zapier webhooks
- Stores submissions in Firestore with timestamp-based IDs

#### weather.js

- Integrates with weather API
- Provides current conditions and forecasts

### State & Operation Managers (src/managers/)

Firebase Configuration

#### openai.js

- Manages OpenAI Assistants API interaction
- Creates and manages threads for conversations
- Handles message processing and response parsing
- Coordinates function execution through function manager
- Maintains conversation context and history

#### function.js

Routes and executes various function types:

- Story submissions
- Feedback collection
- Technical support
- Advertising requests
- Document searches
- Weather queries

#### session-manager.js

Manages chat sessions using Firebase Firestore:

- Creates sessions with timestamp-based IDs (format: "MM-DD-YY at HH-MM-SS AM/PM")
- Stores message history and thread IDs
- Handles session updates and retrieval
- No in-memory caching (serverless architecture)

#### vector-store-manager.js

- Manages document assistant vector store optimization
- Handles chunking and ranking configurations
- Performs initial setup and periodic optimization

#### cleanup-manager.js

- Implements weekly cleanup of old sessions and submissions
- Runs every Wednesday at midnight (Central Time)
- Removes data from previous week

### Utilities (src/utils/)

#### error.js

- Global error handler middleware
- Provides consistent error response format
- Logs errors through Firebase logger

#### logger.js

- Implements structured logging through Firebase
- Provides specialized logging for:
  - Session activity
  - Submissions
  - Errors and warnings
  - General information
- Includes methods for accessing logs via Firebase Console or CLI
- Adds timestamps and structured data to all logs

#### time-utils.js

- Handles time formatting in Central Time
- Provides two format types:
  1. Session format: "MM-DD-YY at HH-MM AM/PM"
     - Used for session and submission document IDs
     - Uses 24-hour time format for consistency
  2. Submission display format: "Month DD, YYYY at HH:MM:SS AM/PM"
     - Used for human-readable timestamps
     - Includes full month name and seconds

## Firebase Configuration

### Firestore Collections

#### 1. Session Document Structure:

Document ID format: `MM-DD-YY at HH-MM-SS AM/PM` (Central Time)

```javascript
sessions_n9 / sessions_n6 {
  sessionId: string, // WatsonX session ID
  userId: string, // User identifier
  threadId: string, // OpenAI thread ID
  messages: [
    {
      role: "user" | "assistant",
      content: string,
      timestamp: string,
    },
  ],
  lastActivity: timestamp,
};
```

#### 2. Submission Document Structure:

```javascript
submissions_n9 / submissions_n6 {
  type: string, // Submission type
  content: string, // Submission content
  zapierResponse: "Success" | "Failed",
  sessionId: string, // Related session ID
  userId: string, // User identifier
  created: timestamp, // Server timestamp
};
```

### Scheduled Functions

1. **Weekly Cleanup** (cleanup-manager.js)
   - Runs every Wednesday at midnight (Central Time)
   - Removes sessions and submissions from previous week
   - Uses batch operations for efficient cleanup
2. **Vector Store Optimization** (vector-store-manager.js)
   - Runs on cold starts
   - Optimizes document search configurations
   - Updates chunking and ranking settings

## Environment Variables

Production environment uses Google Cloud Secret Manager and the following secrets.

If running locally, switch management to use local environment variables and assign the following secrets as variables within a file `.env` in the root of the project.

- `WATSONX_AUTH`: WatsonX webhook authentication
- `ZAPIER_WEBHOOK`: Story submission webhook URL
- `OPENAI_SERVICE_API_KEY`: OpenAI API authentication
- `N6_ASSISTANT_ID`: News ON 6 OpenAI Assistant ID
- `N9_ASSISTANT_ID`: News 9 OpenAI Assistant ID
- `GM_DOC_ASSISTANT_ID`: Document Assistant ID
- `VECTOR_STORE_ID`: Current vector store ID
- `WEATHER_API_KEY`: Weather API authentication
