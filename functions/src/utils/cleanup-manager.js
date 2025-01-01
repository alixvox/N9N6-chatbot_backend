// functions/src/utils/cleanup-manager.js
/**
 * @file Manager for cleaning up old sessions and submissions
 * @module cleanup-manager
 */
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

/**
 * Manager for cleaning up old sessions and submissions
 * @class CleanupManager
 */
class CleanupManager {
  /**
   * Creates an instance of CleanupManager
   */
  constructor() {
    this.db = admin.firestore();
  }

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
   * Cleans up old sessions and submissions for a station
   * @param {string} stationId - Station identifier ('n6' or 'n9')
   * @return {Promise<void>}
   */
  async cleanupStation(stationId) {
    const weekStart = this.getPreviousWeekStart();
    const weekEnd = this.getCurrentWeekStart();

    try {
      // Clean sessions
      const sessionsRef = this.db.collection(`sessions_${stationId}`);
      const oldSessions = await sessionsRef
          .where("lastActivity", ">=", weekStart)
          .where("lastActivity", "<", weekEnd)
          .get();

      // Clean submissions
      const submissionsRef = this.db.collection(`submissions_${stationId}`);
      const oldSubmissions = await submissionsRef
          .where("created", ">=", weekStart)
          .where("created", "<", weekEnd)
          .get();

      // Batch delete in chunks of 500 (Firestore limit)
      const deleteInBatches = async (querySnapshot) => {
        const batches = [];
        let batch = this.db.batch();
        let count = 0;

        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
          count++;

          if (count === 500) {
            batches.push(batch.commit());
            batch = this.db.batch();
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

      logger.info(`Cleanup completed for ${stationId}`, {
        sessionsDeleted,
        submissionsDeleted,
        weekStart: new Date(weekStart).toISOString(),
        weekEnd: new Date(weekEnd).toISOString(),
      });
    } catch (error) {
      logger.error(`Error cleaning up ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Cleans up all stations
   * @return {Promise<void>}
   */
  async cleanupAll() {
    await Promise.all([
      this.cleanupStation("n6"),
      this.cleanupStation("n9"),
    ]);
  }
}

module.exports = new CleanupManager();
