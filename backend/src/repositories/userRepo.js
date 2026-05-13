const { getDb } = require("./db");

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    openid: row.openid,
    phoneNumber: row.phone_number || "",
    phoneCountryCode: row.phone_country_code || "",
    phoneBoundAt: row.phone_bound_at || "",
    phoneBound: !!row.phone_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function getUserById(userId) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);
  return mapUser(row);
}

function getUserByOpenId(openid) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE openid = ?").get(openid);
  return mapUser(row);
}

function getUserByPhoneNumber(phoneNumber) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE phone_number = ?").get(phoneNumber);
  return mapUser(row);
}

function upsertUserFromOpenId(openid, now) {
  const db = getDb();

  db.prepare(`
    INSERT INTO users (
      user_id,
      openid,
      created_at,
      updated_at,
      last_login_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(openid) DO UPDATE SET
      updated_at = excluded.updated_at,
      last_login_at = excluded.last_login_at
  `).run(openid, openid, now, now, now);

  return getUserByOpenId(openid);
}

function bindPhoneNumberToUser(userId, phoneNumber, phoneCountryCode, now) {
  const db = getDb();

  db.prepare(`
    UPDATE users
    SET phone_number = ?,
        phone_country_code = ?,
        phone_bound_at = CASE
          WHEN phone_bound_at IS NULL OR phone_bound_at = '' THEN ?
          ELSE phone_bound_at
        END,
        updated_at = ?
    WHERE user_id = ?
  `).run(phoneNumber, phoneCountryCode || "", now, now, userId);

  return getUserById(userId);
}

module.exports = {
  getUserById,
  getUserByOpenId,
  getUserByPhoneNumber,
  upsertUserFromOpenId,
  bindPhoneNumberToUser,
};
