const { getDb } = require("./db");

function mapSession(row) {
  if (!row) {
    return null;
  }

  return {
    sessionToken: row.session_token,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
  };
}

function createSession(session) {
  const db = getDb();

  db.prepare(`
    INSERT INTO user_sessions (
      session_token,
      user_id,
      created_at,
      updated_at,
      last_used_at,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    session.sessionToken,
    session.userId,
    session.createdAt,
    session.updatedAt,
    session.lastUsedAt,
    session.expiresAt
  );

  return getSessionByToken(session.sessionToken);
}

function getSessionByToken(sessionToken) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM user_sessions WHERE session_token = ?").get(sessionToken);
  return mapSession(row);
}

function touchSession(sessionToken, updatedAt) {
  const db = getDb();

  db.prepare(`
    UPDATE user_sessions
    SET updated_at = ?,
        last_used_at = ?
    WHERE session_token = ?
  `).run(updatedAt, updatedAt, sessionToken);

  return getSessionByToken(sessionToken);
}

function deleteExpiredSessions(now) {
  const db = getDb();
  db.prepare("DELETE FROM user_sessions WHERE expires_at <= ?").run(now);
}

function deleteSessionByToken(sessionToken) {
  const db = getDb();
  const result = db.prepare("DELETE FROM user_sessions WHERE session_token = ?").run(sessionToken);
  return result.changes > 0;
}

module.exports = {
  createSession,
  getSessionByToken,
  touchSession,
  deleteExpiredSessions,
  deleteSessionByToken,
};
