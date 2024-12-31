/**
 * OpenAI Assistants API integration handler
 * @module openai-manager
 */

const OpenAI = require("openai");
const logger = require("./logger");
const sessionManager = require("./session-manager");
const functionManager = require("./function-manager");
const secretsManager = require("./secrets-manager");

const POLLING_INTERVAL = 100;
const MAX_POLLING_TIME = 20000; // 20 seconds

/**
 * Manages OpenAI API client and session polling
 * @class OpenAIManager
 */
class OpenAIManager {
  /**
   * Creates an OpenAIManager
   * @constructor
   * @property {OpenAI} client - OpenAI API client
   * @property {string} n6Id - N6 assistant ID
   * @property {string} n9Id - N9 assistant ID
   */
  constructor() {
    this.client = null;
    this.n6Id = null;
    this.n9Id = null;
  }

  /**
   * Initializes the OpenAI client and loads assistant IDs
   * @private
   */
  async init() {
    if (this.client) return;

    const apiKey = await secretsManager.getSecret("OPENAI_SERVICE_API_KEY");
    this.n6Id = await secretsManager.getSecret("N6_ASSISTANT_ID");
    this.n9Id = await secretsManager.getSecret("N9_ASSISTANT_ID");
    this.client = new OpenAI({apiKey});
  }

  /**
   * Polls a run until it completes or requires action
   * @private
   * @param {string} threadId - OpenAI thread ID
   * @param {string} runId - OpenAI run ID
   * @return {Promise<Object>} Final run status
   */
  async pollRunStatus(threadId, runId) {
    const startTime = Date.now();
    let isRunning = true;
    let run;

    while (isRunning) {
      run = await this.client.beta.threads.runs.retrieve(threadId, runId);

      switch (run.status) {
        case "completed":
        case "requires_action":
          isRunning = false;
          break;
        case "failed":
        case "expired":
        case "cancelled":
          logger.error("Run ended with error status:", {
            status: run.status,
            threadId,
            runId,
          });
          throw new Error(`Run failed with status: ${run.status}`);
        case "queued":
        case "in_progress":
          if (Date.now() - startTime > MAX_POLLING_TIME) {
            throw new Error("Run timed out");
          }
          await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
          break;
        default:
          throw new Error(`Unexpected run status: ${run.status}`);
      }
    }

    return run;
  }

  /**
   * Handles function calls from the assistant
   * @private
   * @param {Object} run - OpenAI run object
   * @param {string} threadId - OpenAI thread ID
   * @param {string} sessionId - WatsonX session ID
   * @param {string} userId - User ID
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   */
  async handleFunctionCalls(run, threadId, sessionId, userId, stationId) {
    const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
    const toolOutputs = [];

    for (const toolCall of toolCalls) {
      const {name, arguments: argsString} = toolCall.function;
      const args = JSON.parse(argsString);

      // Add stationId to args for submission functions
      if (name.startsWith("submit_")) {
        args.stationId = stationId;
      }

      logger.info("Executing function from Assistant:", {
        name,
        args,
        sessionId,
        stationId,
      });

      try {
        const result = await functionManager.executeFunction(
            name,
            args,
            sessionId,
            userId,
        );

        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify(result),
        });
      } catch (error) {
        logger.error("Function execution failed:", {
          error,
          name,
          sessionId,
          stationId,
        });

        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify({error: error.message}),
        });
      }
    }

    // Submit all tool outputs and continue the run
    return await this.client.beta.threads.runs.submitToolOutputs(
        threadId,
        run.id,
        {tool_outputs: toolOutputs},
    );
  }

  /**
   * Gets response from OpenAI Assistant
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @param {string} sessionId - WatsonX session ID
   * @param {string} userId - User ID
   * @param {string} messageText - User's message
   * @return {Promise<Object>} Response for WatsonX
   */
  async getResponseBody(stationId, sessionId, userId, messageText) {
    try {
      await this.init();

      // Get existing session (we know it exists because webhook created it)
      const session = await sessionManager.getSession(sessionId, stationId);
      if (!session) {
        throw new Error("Session not found");
      }

      // Create thread if it doesn't exist
      if (!session.threadId) {
        const thread = await this.client.beta.threads.create();
        await sessionManager.updateThreadId(sessionId, thread.id, stationId);
        session.threadId = thread.id;
      }

      // Add user's message to OpenAI thread
      await this.client.beta.threads.messages.create(session.threadId, {
        role: "user",
        content: messageText,
      });

      // Start a run with appropriate assistant
      const assistantId = stationId === "n6" ? this.n6Id : this.n9Id;
      const run = await this.client.beta.threads.runs.create(
          session.threadId, {assistant_id: assistantId});

      // Poll for completion or action required
      let currentRun = await this.pollRunStatus(session.threadId, run.id);

      // Handle any function calls
      while (currentRun.status === "requires_action") {
        currentRun = await this.handleFunctionCalls(
            currentRun,
            session.threadId,
            sessionId,
            userId,
            stationId,
        );
        currentRun = await this.pollRunStatus(session.threadId, currentRun.id);
      }

      // Get the assistant's response message
      const messages = await this.client.beta.threads.messages.list(
          session.threadId);
      const lastMessage = messages.data[0]; // Most recent message first
      if (!lastMessage?.content?.[0]?.text?.value) {
        logger.error("Invalid message format from OpenAI", {lastMessage});
        throw new Error("Invalid response format from OpenAI");
      }

      try {
        const parsedResponse = JSON.parse(lastMessage.content[0].text.value);

        // Log the parsed structure to understand what we're dealing with
        logger.info("Parsed OpenAI response", {parsedResponse});

        let message;
        if (parsedResponse.response?.message) {
          message = parsedResponse.response.message;
        } else if (parsedResponse.message) {
          message = parsedResponse.message;
        } else {
          logger.error("Unexpected response format", {parsedResponse});
          throw new Error("Unexpected response format from OpenAI");
        }

        // Validate that we got a string
        if (typeof message !== "string") {
          logger.error("Message is not a string", {
            message,
            type: typeof message,
          });
          throw new Error("Message must be a string");
        }

        return message;
      } catch (error) {
        logger.error("Failed to parse OpenAI response", {
          error,
          content: lastMessage.content[0].text.value,
        });
        throw new Error("Failed to parse OpenAI response");
      }
    } catch (error) {
      logger.error("Error in getResponseBody:", {
        error,
        sessionId,
        stationId,
      });
      throw error;
    }
  }
}

module.exports = new OpenAIManager();
