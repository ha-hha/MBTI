const env = require("../config/env");
const { createError } = require("../utils/errors");

const ACCESS_TOKEN_BUFFER_MS = 60 * 1000;

let accessTokenCache = {
  token: "",
  expiresAt: 0,
};

function ensureWeChatConfig() {
  if (!env.wechatAppId || !env.wechatAppSecret) {
    throw createError(
      "WECHAT_AUTH_NOT_CONFIGURED",
      "wechat auth env is not configured",
      500
    );
  }
}

async function requestWeChatJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.wechatApiTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw createError("WECHAT_API_REQUEST_FAILED", "wechat api request failed", 502);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw createError("WECHAT_API_TIMEOUT", "wechat api request timed out", 504);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getSessionFromWeChat(code) {
  ensureWeChatConfig();

  const params = new URLSearchParams({
    appid: env.wechatAppId,
    secret: env.wechatAppSecret,
    js_code: code,
    grant_type: "authorization_code",
  });

  const result = await requestWeChatJson(
    `https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`,
    {
      method: "GET",
    }
  );

  if (result.errcode) {
    throw createError("WECHAT_AUTH_FAILED", result.errmsg || "wechat auth failed", 401);
  }

  if (!result.openid) {
    throw createError("WECHAT_AUTH_FAILED", "openid missing in wechat auth response", 401);
  }

  return {
    openid: result.openid,
    sessionKey: result.session_key || "",
    unionid: result.unionid || "",
  };
}

async function getWeChatAccessToken(forceRefresh = false) {
  ensureWeChatConfig();

  if (
    !forceRefresh
    && accessTokenCache.token
    && accessTokenCache.expiresAt > (Date.now() + ACCESS_TOKEN_BUFFER_MS)
  ) {
    return accessTokenCache.token;
  }

  const params = new URLSearchParams({
    grant_type: "client_credential",
    appid: env.wechatAppId,
    secret: env.wechatAppSecret,
  });

  const result = await requestWeChatJson(
    `https://api.weixin.qq.com/cgi-bin/token?${params.toString()}`,
    {
      method: "GET",
    }
  );

  if (result.errcode || !result.access_token) {
    throw createError(
      "WECHAT_ACCESS_TOKEN_FAILED",
      result.errmsg || "wechat access token request failed",
      502
    );
  }

  accessTokenCache = {
    token: result.access_token,
    expiresAt: Date.now() + ((result.expires_in || 7200) * 1000),
  };

  return accessTokenCache.token;
}

async function requestPhoneNumberWithToken(accessToken, code) {
  const result = await requestWeChatJson(
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ code }),
    }
  );

  if (result.errcode) {
    throw createError(
      "WECHAT_PHONE_NUMBER_FAILED",
      result.errmsg || "wechat phone number request failed",
      result.errcode === 40029 ? 401 : 502
    );
  }

  if (!result.phone_info || !result.phone_info.phoneNumber) {
    throw createError("WECHAT_PHONE_NUMBER_FAILED", "phone number missing", 502);
  }

  return {
    phoneNumber: result.phone_info.phoneNumber,
    purePhoneNumber: result.phone_info.purePhoneNumber || result.phone_info.phoneNumber,
    countryCode: result.phone_info.countryCode || "",
  };
}

async function getPhoneNumberFromWeChat(code) {
  ensureWeChatConfig();

  if (!code || typeof code !== "string") {
    throw createError("INVALID_PHONE_AUTH_CODE", "phone auth code is required", 400);
  }

  try {
    const accessToken = await getWeChatAccessToken();
    return await requestPhoneNumberWithToken(accessToken, code);
  } catch (error) {
    if (error.code !== "WECHAT_PHONE_NUMBER_FAILED") {
      throw error;
    }

    const refreshedAccessToken = await getWeChatAccessToken(true);
    return requestPhoneNumberWithToken(refreshedAccessToken, code);
  }
}

module.exports = {
  getSessionFromWeChat,
  getPhoneNumberFromWeChat,
};
