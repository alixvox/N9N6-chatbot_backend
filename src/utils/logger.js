const fs = require('fs');
const path = require('path');

class SessionLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.sessionLogPath = path.join(this.logDir, 'sessions.log');
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  logSessionData(sessionData) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ...sessionData
    };

    fs.appendFileSync(
      this.sessionLogPath,
      JSON.stringify(logEntry, null, 2) + '\n---\n',
      'utf8'
    );
  }

  formatForOpenAI(sessionData) {
    const formattedMessages = sessionData.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    return {
      messages: formattedMessages,
      metadata: {
        station_id: sessionData.stationId,
        user_id: sessionData.userId,
        session_id: sessionData.sessionId
      }
    };
  }

  getSessionsLog() {
    if (fs.existsSync(this.sessionLogPath)) {
      return fs.readFileSync(this.sessionLogPath, 'utf8');
    }
    return 'No session logs yet.';
  }
}

module.exports = new SessionLogger();

