const { getDb } = require("./db");

function mapAdminSession(row) {
  if (!row) {
    return null;
  }

  return {
    sessionTokenHash: row.session_token_hash,
    username: row.username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
  };
}

function createAdminSession(session) {
  const db = getDb();

  db.prepare(`
    INSERT INTO admin_sessions (
      session_token_hash,
      username,
      created_at,
      updated_at,
      last_used_at,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    session.sessionTokenHash,
    session.username,
    session.createdAt,
    session.updatedAt,
    session.lastUsedAt,
    session.expiresAt
  );

  return getAdminSessionByTokenHash(session.sessionTokenHash);
}

function getAdminSessionByTokenHash(sessionTokenHash) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM admin_sessions WHERE session_token_hash = ?")
    .get(sessionTokenHash);

  return mapAdminSession(row);
}

function touchAdminSession(sessionTokenHash, updatedAt) {
  const db = getDb();

  db.prepare(`
    UPDATE admin_sessions
    SET updated_at = ?,
        last_used_at = ?
    WHERE session_token_hash = ?
  `).run(updatedAt, updatedAt, sessionTokenHash);

  return getAdminSessionByTokenHash(sessionTokenHash);
}

function deleteAdminSessionByTokenHash(sessionTokenHash) {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM admin_sessions WHERE session_token_hash = ?")
    .run(sessionTokenHash);

  return result.changes > 0;
}

function deleteExpiredAdminSessions(now) {
  const db = getDb();
  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(now);
}

module.exports = {
  createAdminSession,
  getAdminSessionByTokenHash,
  touchAdminSession,
  deleteAdminSessionByTokenHash,
  deleteExpiredAdminSessions,
};
