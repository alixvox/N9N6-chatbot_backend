// functions/src/utils/vector-store-manager.js
/**
 * @file Manages vector store operations for document assistant
 * @module vector-store-manager
 */

const admin = require("firebase-admin");
const OpenAI = require("openai");
const logger = require("./logger");
const secretsManager = require("./secrets-manager");

const db = admin.firestore();
const VECTOR_STORE_DOC = "config/vector_store";

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
 * Gets current vector store ID from Firestore
 * @private
 * @return {Promise<string|null>} Current vector store ID or null
 */
async function getCurrentVectorStoreId() {
  const doc = await db.doc(VECTOR_STORE_DOC).get();
  return doc.exists ? doc.data().vectorStoreId : null;
}

/**
 * Updates vector store ID in Firestore
 * @private
 * @param {string} vectorStoreId - New vector store ID
 */
async function updateVectorStoreId(vectorStoreId) {
  await db.doc(VECTOR_STORE_DOC).set({
    vectorStoreId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
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
    for await (
      const file of client.beta.vector_stores.files.list(vectorStoreId)) {
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

    // Get current vector store ID
    const currentVectorStoreId = await getCurrentVectorStoreId();
    if (!currentVectorStoreId) {
      logger.warn("No existing vector store ID found");
      return;
    }

    // Get existing file IDs
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

    // Delete old vector store
    if (currentVectorStoreId) {
      await client.beta.vector_stores.del(currentVectorStoreId);
    }

    // Update stored vector store ID
    await updateVectorStoreId(newVectorStore.id);

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
