const admin = require('firebase-admin');
const logger = require('./logger');

// Initialize Firebase
const serviceAccount = require('../../path/to/your/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const sessionsRef = db.collection('sessions');

class SessionManager {
  constructor() {
    this.sessions = new Map(); // Keep in-memory cache
    setInterval(() => this.cleanupOldSessions(), 1800000);
  }

  async getOrCreateSession(sessionId, userId, stationId) {
    // Check memory cache first
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    // Check Firebase
    const sessionDoc = await sessionsRef.doc(sessionId).get();
    
    if (sessionDoc.exists) {
      const sessionData = sessionDoc.data();
      this.sessions.set(sessionId, sessionData);
      return sessionData;
    }

    // Create new session
    const newSession = {
      sessionId,
      userId,
      stationId,
      conversationHistory: [
        {
          role: "system",
          content: `You are a helpful assistant for ${stationId} news station. You help users with information about news, weather, and station-specific inquiries.`
        }
      ],
      lastActivity: Date.now()
    };
    
    // Save to Firebase
    await sessionsRef.doc(sessionId).set(newSession);
    
    // Save to memory cache
    this.sessions.set(sessionId, newSession);
    logger.logSessionData(newSession);
    
    return newSession;
  }

  async updateSession(sessionId, message, role = 'user') {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationHistory.push({
        role,
        content: message
      });
      session.lastActivity = Date.now();

      // Update Firebase
      await sessionsRef.doc(sessionId).update({
        conversationHistory: session.conversationHistory,
        lastActivity: session.lastActivity
      });

      logger.logSessionData(session);
    }
    return session;
  }

  async cleanupOldSessions() {
    const now = Date.now();
    const OLD_SESSION_THRESHOLD = 3600000; // 1 hour

    // Query for old sessions
    const oldSessions = await sessionsRef
      .where('lastActivity', '<', now - OLD_SESSION_THRESHOLD)
      .get();

    // Delete old sessions
    const batch = db.batch();
    oldSessions.forEach(doc => {
      batch.delete(doc.ref);
      this.sessions.delete(doc.id);
    });

    await batch.commit();
  }

  async getOpenAIFormat(sessionId) {
    const session = await this.getOrCreateSession(sessionId);
    if (session) {
      return logger.formatForOpenAI(session);
    }
    return null;
  }
}

module.exports = new SessionManager();

