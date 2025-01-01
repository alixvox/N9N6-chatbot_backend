// functions/src/managers/cleanup-manager.js
/**
 * @file Manager for cleaning up old sessions and submissions
 * @module cleanup-manager
 */
const admin = require("firebase-admin");
const logger = require("../utils/logger");

/**
 * Manager for cleaning up old sessions and submissions
 * @class CleanupManager
 */
class CleanupManager {
  /**
   * Gets timestamp for last week's Sunday midnight
   * @private
   * @return {number} Timestamp
   */
  getPreviousWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToLastSunday = dayOfWeek + 7; // Go back to previous week's Sunday
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - daysToLastSunday);
    lastSunday.setHours(0, 0, 0, 0);
    return lastSunday.getTime();
  }

  /**
   * Gets timestamp for this week's Sunday midnight
   * @private
   * @return {number} Timestamp
   */
  getCurrentWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToSunday = dayOfWeek;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - daysToSunday);
    sunday.setHours(0, 0, 0, 0);
    return sunday.getTime();
  }

  /**
   * Cleans up old sessions and submissions for both stations
   * @return {Promise<void>}
   */
  async cleanupStations() {
    const weekStart = this.getPreviousWeekStart();
    const weekEnd = this.getCurrentWeekStart();
    const db = admin.firestore();
    const stations = ["n6", "n9"];

    try {
      const cleanupResults = await Promise.all(
          stations.map(async (stationId) => {
          // Clean sessions
            const sessionsRef = db.collection(`sessions_${stationId}`);
            const oldSessions = await sessionsRef
                .where("lastActivity", ">=", weekStart)
                .where("lastActivity", "<", weekEnd)
                .get();

            // Clean submissions
            const submissionsRef = db.collection(`submissions_${stationId}`);
            const oldSubmissions = await submissionsRef
                .where("created", ">=", weekStart)
                .where("created", "<", weekEnd)
                .get();

            // Batch delete in chunks of 500 (Firestore limit)
            const deleteInBatches = async (querySnapshot) => {
              const batches = [];
              let batch = db.batch();
              let count = 0;

              querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
                count++;

                if (count === 500) {
                  batches.push(batch.commit());
                  batch = db.batch();
                  count = 0;
                }
              });

              if (count > 0) {
                batches.push(batch.commit());
              }

              await Promise.all(batches);
              return querySnapshot.size;
            };

            const [sessionsDeleted, submissionsDeleted] = await Promise.all([
              deleteInBatches(oldSessions),
              deleteInBatches(oldSubmissions),
            ]);

            return {
              stationId,
              sessionsDeleted,
              submissionsDeleted,
            };
          }),
      );

      logger.info("Cleanup completed for all stations", {
        results: cleanupResults,
        weekStart: new Date(weekStart).toISOString(),
        weekEnd: new Date(weekEnd).toISOString(),
      });
    } catch (error) {
      logger.error("Error cleaning up stations:", error);
      throw error;
    }
  }
}

module.exports = new CleanupManager();
