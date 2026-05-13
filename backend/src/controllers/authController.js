const authService = require("../services/authService");
const { createError } = require("../utils/errors");

async function loginWithWeChat(req, res, next) {
  try {
    if (!req.body || typeof req.body !== "object") {
      throw createError("INVALID_REQUEST_BODY", "request body must be a JSON object", 400);
    }

    const result = await authService.loginWithWeChat(req.body.code);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function getCurrentUserProfile(req, res, next) {
  try {
    const result = authService.getCurrentUserProfile(req.headers);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function bindPhoneNumber(req, res, next) {
  try {
    if (!req.body || typeof req.body !== "object") {
      throw createError("INVALID_REQUEST_BODY", "request body must be a JSON object", 400);
    }

    const result = await authService.bindPhoneNumber(req.headers, req.body.code);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function logout(req, res, next) {
  try {
    const result = authService.logout(req.headers);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  loginWithWeChat,
  getCurrentUserProfile,
  bindPhoneNumber,
  logout,
};
