const crypto = require("crypto");
const Database = require("better-sqlite3");
const env = require("../config/env");
const { getSessionFromWeChat, getPhoneNumberFromWeChat } = require("../clients/wechatClient");
const {
  createSession,
  deleteExpiredSessions,
  deleteSessionByToken,
  getSessionByToken,
  touchSession,
} = require("../repositories/sessionRepo");
const {
  bindPhoneNumberToUser,
  getUserById,
  getUserByPhoneNumber,
  upsertUserFromOpenId,
} = require("../repositories/userRepo");
const { createError } = require("../utils/errors");
const { nowIsoString } = require("../utils/time");

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function createSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

function buildAuthPayload(user, session = null) {
  return {
    userId: user.userId,
    sessionToken: session ? session.sessionToken : "",
    expiresAt: session ? session.expiresAt : "",
    phoneNumber: user.phoneNumber || "",
    phoneCountryCode: user.phoneCountryCode || "",
    phoneBound: !!user.phoneBound,
  };
}

function resolveSessionFromHeaders(headers = {}) {
  const sessionToken = headers["x-session-token"];

  if (!sessionToken) {
    return null;
  }

  const session = getSessionByToken(sessionToken);

  if (!session) {
    throw createError("AUTH_SESSION_NOT_FOUND", "session token is invalid", 401);
  }

  if (session.expiresAt <= nowIsoString()) {
    throw createError("AUTH_SESSION_EXPIRED", "session token expired", 401);
  }

  touchSession(sessionToken, nowIsoString());
  return session;
}

async function loginWithWeChat(code) {
  if (!code || typeof code !== "string") {
    throw createError("INVALID_AUTH_CODE", "code is required", 400);
  }

  const now = new Date();
  const nowString = now.toISOString();
  const wechatSession = await getSessionFromWeChat(code);
  const user = upsertUserFromOpenId(wechatSession.openid, nowString);

  deleteExpiredSessions(nowString);

  const session = createSession({
    sessionToken: createSessionToken(),
    userId: user.userId,
    createdAt: nowString,
    updatedAt: nowString,
    lastUsedAt: nowString,
    expiresAt: addDays(now, env.sessionTokenTtlDays).toISOString(),
  });

  return buildAuthPayload(user, session);
}

function getCurrentUserProfile(headers = {}) {
  const session = resolveSessionFromHeaders(headers);

  if (session) {
    const user = getUserById(session.userId);

    if (!user) {
      throw createError("AUTH_USER_NOT_FOUND", "user not found", 404);
    }

    return buildAuthPayload(user, session);
  }

  const fallbackUserId = headers["x-user-id"] || env.defaultUserId;
  return {
    userId: fallbackUserId,
    sessionToken: "",
    expiresAt: "",
    phoneNumber: "",
    phoneCountryCode: "",
    phoneBound: true,
  };
}

async function bindPhoneNumber(headers = {}, phoneCode) {
  const session = resolveSessionFromHeaders(headers);

  if (!session) {
    throw createError("AUTH_REQUIRED", "session token is required", 401);
  }

  const user = getUserById(session.userId);

  if (!user) {
    throw createError("AUTH_USER_NOT_FOUND", "user not found", 404);
  }

  const phoneInfo = await getPhoneNumberFromWeChat(phoneCode);
  const existingPhoneOwner = getUserByPhoneNumber(phoneInfo.phoneNumber);

  if (existingPhoneOwner && existingPhoneOwner.userId !== user.userId) {
    throw createError("PHONE_NUMBER_ALREADY_BOUND", "phone number already bound", 409);
  }

  try {
    const updatedUser = bindPhoneNumberToUser(
      user.userId,
      phoneInfo.phoneNumber,
      phoneInfo.countryCode,
      nowIsoString()
    );

    return buildAuthPayload(updatedUser, session);
  } catch (error) {
    if (
      error instanceof Database.SqliteError
      && error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      throw createError("PHONE_NUMBER_ALREADY_BOUND", "phone number already bound", 409);
    }

    throw error;
  }
}

function logout(headers = {}) {
  const session = resolveSessionFromHeaders(headers);

  if (!session) {
    throw createError("AUTH_REQUIRED", "session token is required", 401);
  }

  deleteSessionByToken(session.sessionToken);

  return {
    success: true,
  };
}

function resolveUserIdFromHeaders(headers = {}) {
  const session = resolveSessionFromHeaders(headers);

  if (session) {
    return session.userId;
  }

  return headers["x-user-id"] || env.defaultUserId;
}

module.exports = {
  loginWithWeChat,
  getCurrentUserProfile,
  bindPhoneNumber,
  logout,
  resolveUserIdFromHeaders,
};
