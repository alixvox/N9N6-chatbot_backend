// functions/src/utils/document-manager.js
/**
 * @file Manages document uploading and vector store updates
 * @module document-manager
 */
const admin = require("firebase-admin");
const fs = require("fs").promises;
const path = require("path");
const logger = require("./logger");
const OpenAI = require("openai");
const secretsManager = require("./secrets-manager");

/**
 * Manages OpenAI vector store document syncing
 * @class DocumentManager
 */
class DocumentManager {
  /**
   * Constructs the DocumentManager instance
   */
  constructor() {
    this.documentsPath = path.join(__dirname, "../../../data/documents");
    this.openai = null;
    this.docAssistantId = null;
  }

  /**
   * Initialize OpenAI client and get assistant ID
   * @private
   */
  async initOpenAI() {
    if (this.openai) return;

    const apiKey = await secretsManager.getSecret("OPENAI_SERVICE_API_KEY");
    this.docAssistantId = await secretsManager.getSecret("GM_DOC_ASSISTANT_ID");
    this.openai = new OpenAI({apiKey});
  }

  /**
   * Upload files, create vector store, and update assistant
   * @return {Promise<void>}
   */
  async syncDocuments() {
    try {
      await this.initOpenAI();

      // Get document files
      const files = await fs.readdir(this.documentsPath);
      const txtFiles = files.filter((file) => file.endsWith(".txt"));

      if (txtFiles.length === 0) {
        throw new Error("No .txt files found in documents directory");
      }

      // Upload all files to OpenAI
      logger.info("Uploading files to OpenAI");
      const uploadPromises = txtFiles.map(async (filename) => {
        const filePath = path.join(this.documentsPath, filename);
        const file = await this.openai.files.create({
          file: await fs.readFile(filePath),
          purpose: "assistants",
        });
        return file.id;
      });

      const fileIds = await Promise.all(uploadPromises);
      logger.info("Files uploaded successfully", {count: fileIds.length});

      // Create new vector store
      logger.info("Creating vector store");
      const vectorStore = await this.openai.beta.vectorStores.create({
        name: "Griffin Media Documentation",
      });

      // Add files to vector store and wait for processing
      logger.info("Adding files to vector store");
      await this.openai.beta.vectorStores.fileBatches.uploadAndPoll(
          vectorStore.id,
          fileIds,
      );

      // Update the assistant with the new vector store
      logger.info("Updating assistant with new vector store");
      await this.openai.beta.assistants.update(
          this.docAssistantId,
          {
            tools: [{type: "file_search"}],
            tool_resources: {
              "file_search": {
                "vector_store_ids": [vectorStore.id],
              },
            },
          },
      );

      // Store reference info in Firestore
      await admin.firestore()
          .collection("system")
          .doc("documentSync")
          .set({
            vectorStoreId: vectorStore.id,
            fileIds,
            lastSync: admin.firestore.FieldValue.serverTimestamp(),
          });

      logger.info("Document sync completed", {
        vectorStoreId: vectorStore.id,
        fileCount: fileIds.length,
      });
    } catch (error) {
      logger.error("Error syncing documents:", error);
      throw error;
    }
  }
}

module.exports = new DocumentManager();
