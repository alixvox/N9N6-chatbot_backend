/**
 * @file Manages vector store operations for document assistant
 * @module vector-store-manager
 */

const OpenAI = require("openai");
const logger = require("../utils/logger");
const secretsManager = require("./secrets");

let client = null;

/**
 * Initializes OpenAI client
 * @private
 */
async function initClient() {
  if (client) return;
  const apiKey = await secretsManager.getSecret("OPENAI_SERVICE_API_KEY");
  client = new OpenAI({apiKey});
}

/**
 * Gets current vector store ID from Secret Manager
 * @private
 * @return {Promise<string|null>} Current vector store ID or null
 */
async function getCurrentVectorStoreId() {
  try {
    return await secretsManager.getSecret("VECTOR_STORE_ID");
  } catch (error) {
    logger.warn("No existing vector store ID found in secrets");
    return null;
  }
}

/**
 * Updates vector store ID in Secret Manager
 * @private
 * @param {string} vectorStoreId - New vector store ID
 */
async function updateVectorStoreId(vectorStoreId) {
  await secretsManager.updateSecret("VECTOR_STORE_ID", vectorStoreId);
  logger.info("Updated vector store ID in secrets");
}

/**
 * Checks if vector store needs optimization
 * @private
 * @param {string} vectorStoreId - Vector store ID to check
 * @return {Promise<boolean>} True if optimization needed
 */
async function needsOptimization(vectorStoreId) {
  try {
    // Get first file from vector store to check its settings
    const files = await client.beta.vector_stores.files.list(vectorStoreId);
    const firstFile = files.data[0];

    if (!firstFile) {
      logger.warn("No files found in vector store to check settings");
      return false;
    }

    const currentStrategy = firstFile.chunking_strategy;

    // Check if current settings match our desired settings
    const isOptimized =
      currentStrategy.max_chunk_size_tokens === 400 &&
      currentStrategy.chunk_overlap_tokens === 100;

    // Also check assistant settings
    const docAssistantId = await secretsManager.getSecret(
        "GM_DOC_ASSISTANT_ID");
    const assistant = await client.beta.assistants.retrieve(docAssistantId);

    const fileSearchTool = assistant.tools.find(
        (tool) => tool.type === "file_search");
    const hasOptimalToolSettings =
      fileSearchTool?.max_num_results === 5 &&
      fileSearchTool?.ranking_options?.score_threshold === 0.7;

    if (isOptimized && hasOptimalToolSettings) {
      logger.info("Vector store and assistant already have optimal settings");
      return false;
    }

    logger.info("Optimization needed", {
      currentChunkSize: currentStrategy.max_chunk_size_tokens,
      currentOverlap: currentStrategy.chunk_overlap_tokens,
      currentMaxResults: fileSearchTool?.max_num_results,
      currentThreshold: fileSearchTool?.ranking_options?.score_threshold,
    });

    return true;
  } catch (error) {
    logger.error("Error checking optimization status:", error);
    return true; // Default to needing optimization if check fails
  }
}

/**
 * Gets file IDs from existing vector store
 * @private
 * @param {string} vectorStoreId - Vector store ID
 * @return {Promise<string[]>} Array of file IDs
 */
async function getExistingFileIds(vectorStoreId) {
  const fileIds = [];
  try {
    for await (const file of client.beta.vector_stores.files.list(
        vectorStoreId)) {
      fileIds.push(file.id);
    }
  } catch (error) {
    logger.error("Error getting file IDs:", error);
  }
  return fileIds;
}

/**
 * Optimizes document assistant vector store
 * @return {Promise<void>}
 */
async function optimizeVectorStore() {
  try {
    await initClient();

    // Get current vector store ID from secrets
    const currentVectorStoreId = await getCurrentVectorStoreId();
    if (!currentVectorStoreId) {
      logger.warn("No existing vector store ID found in secrets");
      return;
    }

    // Check if optimization is needed
    const shouldOptimize = await needsOptimization(currentVectorStoreId);
    if (!shouldOptimize) {
      logger.info("Vector store optimization not needed");
      return;
    }

    // Get existing files
    const fileIds = await getExistingFileIds(currentVectorStoreId);
    if (fileIds.length === 0) {
      logger.warn("No files found in current vector store");
      return;
    }

    // Create new optimized vector store
    logger.info("Creating new optimized vector store");
    const newVectorStore = await client.beta.vector_stores.create({
      name: "GM Doc Assistant Store",
    });

    // Add existing files with optimized chunking
    const batch = await client.beta.vector_stores.file_batches.create(
        newVectorStore.id,
        {
          file_ids: fileIds,
          chunking_strategy: {
            max_chunk_size_tokens: 400,
            chunk_overlap_tokens: 100,
          },
        },
    );

    // Wait for batch processing to complete
    while (batch.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const updatedBatch = await client.beta.vector_stores.file_batches
          .retrieve(newVectorStore.id, batch.id);
      if (updatedBatch.status === "failed") {
        throw new Error("Batch processing failed");
      }
      if (updatedBatch.status === "succeeded") {
        break;
      }
    }

    // Update document assistant with new vector store
    const docAssistantId = await secretsManager.getSecret(
        "GM_DOC_ASSISTANT_ID");
    await client.beta.assistants.update(docAssistantId, {
      tools: [{
        type: "file_search",
        max_num_results: 5,
        ranking_options: {
          ranker: "default_2024_08_21",
          score_threshold: 0.7,
        },
      }],
      tool_resources: {
        file_search: {
          vector_store_ids: [newVectorStore.id],
        },
      },
    });

    // Update stored vector store ID in secrets before deleting old one
    await updateVectorStoreId(newVectorStore.id);

    // Delete old vector store
    if (currentVectorStoreId) {
      await client.beta.vector_stores.del(currentVectorStoreId);
    }

    logger.info("Vector store optimization complete", {
      newVectorStoreId: newVectorStore.id,
      fileCount: fileIds.length,
    });
  } catch (error) {
    logger.error("Error optimizing vector store:", error);
    throw error;
  }
}

module.exports = {
  optimizeVectorStore,
};
