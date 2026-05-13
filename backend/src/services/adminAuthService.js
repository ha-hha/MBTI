const crypto = require("crypto");
const env = require("../config/env");
const {
  createAdminSession,
  deleteAdminSessionByTokenHash,
  deleteExpiredAdminSessions,
  getAdminSessionByTokenHash,
  touchAdminSession,
} = require("../repositories/adminSessionRepo");
const { parseCookieHeader, serializeCookie } = require("../utils/cookies");
const { createError } = require("../utils/errors");
const { nowIsoString } = require("../utils/time");

const ADMIN_SESSION_COOKIE_NAME = "mbti_admin_session";

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function hashSha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createHmacSignature(value) {
  return crypto.createHmac("sha256", env.adminSessionSecret).update(value).digest("hex");
}

function normalizePasswordHash(passwordHash) {
  return passwordHash.replace(/^sha256:/, "").trim().toLowerCase();
}

function secureCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashAdminSessionToken(sessionToken) {
  return hashSha256(`${env.adminSessionSecret}:${sessionToken}`);
}

function buildSignedCookieValue(sessionToken) {
  const signature = createHmacSignature(sessionToken);
  return `${sessionToken}.${signature}`;
}

function parseSignedCookieValue(cookieValue) {
  if (!cookieValue) {
    return "";
  }

  const separatorIndex = cookieValue.lastIndexOf(".");

  if (separatorIndex === -1) {
    return "";
  }

  const sessionToken = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const expectedSignature = createHmacSignature(sessionToken);

  if (!secureCompare(signature, expectedSignature)) {
    return "";
  }

  return sessionToken;
}

function ensureAdminConfigured() {
  if (!env.adminUsername || !env.adminPasswordHash || !env.adminSessionSecret) {
    throw createError(
      "ADMIN_NOT_CONFIGURED",
      "admin dashboard credentials are not configured",
      503
    );
  }
}

function getAdminCookieOptions(maxAgeSeconds) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
  };
}

function buildAdminSessionCookie(sessionToken) {
  return serializeCookie(
    ADMIN_SESSION_COOKIE_NAME,
    buildSignedCookieValue(sessionToken),
    getAdminCookieOptions(env.adminSessionTtlDays * 24 * 60 * 60)
  );
}

function buildClearAdminSessionCookie() {
  return serializeCookie(ADMIN_SESSION_COOKIE_NAME, "", {
    ...getAdminCookieOptions(0),
    maxAge: 0,
  });
}

function buildAdminPayload(session) {
  return {
    username: session.username,
    expiresAt: session.expiresAt,
    lastUsedAt: session.lastUsedAt,
  };
}

function resolveAdminSessionFromHeaders(headers = {}) {
  ensureAdminConfigured();

  const cookies = parseCookieHeader(headers.cookie || "");
  const rawSessionToken = parseSignedCookieValue(cookies[ADMIN_SESSION_COOKIE_NAME]);

  if (!rawSessionToken) {
    return null;
  }

  deleteExpiredAdminSessions(nowIsoString());

  const session = getAdminSessionByTokenHash(hashAdminSessionToken(rawSessionToken));

  if (!session) {
    return null;
  }

  if (session.expiresAt <= nowIsoString()) {
    deleteAdminSessionByTokenHash(session.sessionTokenHash);
    return null;
  }

  return touchAdminSession(session.sessionTokenHash, nowIsoString());
}

function requireAdminSession(headers = {}) {
  const session = resolveAdminSessionFromHeaders(headers);

  if (!session) {
    throw createError("ADMIN_AUTH_REQUIRED", "admin authentication required", 401);
  }

  return session;
}

function loginWithPassword(username, password) {
  ensureAdminConfigured();

  if (!username || !password) {
    throw createError("ADMIN_INVALID_CREDENTIALS", "invalid username or password", 401);
  }

  const expectedPasswordHash = normalizePasswordHash(env.adminPasswordHash);
  const providedPasswordHash = hashSha256(password);

  if (
    username !== env.adminUsername
    || !secureCompare(providedPasswordHash, expectedPasswordHash)
  ) {
    throw createError("ADMIN_INVALID_CREDENTIALS", "invalid username or password", 401);
  }

  const now = new Date();
  const nowString = now.toISOString();
  deleteExpiredAdminSessions(nowString);
  const rawSessionToken = createSessionToken();
  const session = createAdminSession({
    sessionTokenHash: hashAdminSessionToken(rawSessionToken),
    username,
    createdAt: nowString,
    updatedAt: nowString,
    lastUsedAt: nowString,
    expiresAt: addDays(now, env.adminSessionTtlDays).toISOString(),
  });

  return {
    admin: buildAdminPayload(session),
    cookie: buildAdminSessionCookie(rawSessionToken),
  };
}

function getCurrentAdmin(headers = {}) {
  const session = requireAdminSession(headers);
  return buildAdminPayload(session);
}

function logout(headers = {}) {
  ensureAdminConfigured();

  const cookies = parseCookieHeader(headers.cookie || "");
  const rawSessionToken = parseSignedCookieValue(cookies[ADMIN_SESSION_COOKIE_NAME]);

  if (rawSessionToken) {
    deleteAdminSessionByTokenHash(hashAdminSessionToken(rawSessionToken));
  }

  return {
    success: true,
    clearCookie: buildClearAdminSessionCookie(),
  };
}

module.exports = {
  buildClearAdminSessionCookie,
  getCurrentAdmin,
  loginWithPassword,
  logout,
  requireAdminSession,
  resolveAdminSessionFromHeaders,
};
