// functions/src/functions/document-search.js
/**
 * @file Document search functions using Griffin Media Document Assistant
 * @module functions/document
 */

const OpenAI = require("openai");
const logger = require("../utils/logger");
const secretsManager = require("../utils/secrets-manager");

let client = null;
let docAssistantId = null;

/**
 * Initializes the OpenAI client and loads document assistant ID
 * @private
 */
async function initClient() {
  if (client) return;

  const apiKey = await secretsManager.getSecret("OPENAI_SERVICE_API_KEY");
  docAssistantId = await secretsManager.getSecret("GM_DOC_ASSISTANT_ID");
  client = new OpenAI({apiKey});
}

/**
 * Polls a run until it completes
 * @private
 * @param {string} threadId - OpenAI thread ID
 * @param {string} runId - OpenAI run ID
 * @return {Promise<Object>} Final run status
 */
async function pollRunStatus(threadId, runId) {
  const startTime = Date.now();
  const POLLING_INTERVAL = 500;
  const MAX_POLLING_TIME = 20000; // 20 seconds

  let isRunning = true;
  let run;

  while (isRunning) {
    run = await client.beta.threads.runs.retrieve(threadId, runId);

    switch (run.status) {
      case "completed":
        isRunning = false;
        break;
      case "failed":
      case "expired":
      case "cancelled":
        logger.error(
            "Document assistant run ended with error status:", {
              status: run.status,
              threadId,
              runId,
            });
        throw new Error(
            `Document assistant run failed with status: ${run.status}`);
      case "queued":
      case "in_progress":
        if (Date.now() - startTime > MAX_POLLING_TIME) {
          throw new Error("Document assistant run timed out");
        }
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        break;
      default:
        throw new Error(
            `Unexpected document assistant run status: ${run.status}`);
    }
  }

  return run;
}

/**
 * Queries the document assistant with a search query
 * @param {Object} args - Function arguments from OpenAI
 * containing the search query
 * @param {string} sessionId - Original session ID for logging
 * @return {Promise<Object>} Search results from document assistant
 */
async function handleDocumentSearch(args, sessionId) {
  try {
    await initClient();

    // Create a new thread for this query
    const thread = await client.beta.threads.create();

    // Add the query message to the thread
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: args.query,
    });

    // Start a run with the document assistant
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: docAssistantId,
    });

    // Wait for completion
    await pollRunStatus(thread.id, run.id);

    // Get the assistant's response
    const messages = await client.beta.threads.messages.list(thread.id);
    const response = messages.data[0]?.content?.[0]?.text?.value;

    if (!response) {
      logger.error("Invalid or empty response from document assistant", {
        threadId: thread.id,
        sessionId,
      });
      throw new Error("Invalid response from document assistant");
    }

    logger.info("Document search completed", {
      query: args.query,
      threadId: thread.id,
      sessionId,
    });

    // Return the raw text response
    return {answer: response};
  } catch (error) {
    logger.error("Error in document search:", {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

module.exports = {
  handleDocumentSearch,
};
