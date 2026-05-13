const AUTH_STORAGE_KEY = "mbti_auth_session_v1";
const AUTH_LOGOUT_LOCK_KEY = "mbti_auth_logout_lock_v1";

const DEFAULT_RUNTIME_CONFIG = {
  assessmentId: "mbti_ai_value",
  apiBaseUrl: "https://mbti.pinggu.com",
  assetBaseUrl: "https://mbti.pinggu.com",
  useMock: false,
  userId: "",
  requestHeaders: {},
};

function normalizeApiBaseUrl(apiBaseUrl) {
  return (apiBaseUrl || "").replace(/\/+$/, "");
}

function normalizeAssetBaseUrl(assetBaseUrl) {
  return (assetBaseUrl || "").replace(/\/+$/, "");
}

function loadStoredAuthSession() {
  try {
    return wx.getStorageSync(AUTH_STORAGE_KEY) || null;
  } catch (error) {
    return null;
  }
}

function loadStoredLogoutLock() {
  try {
    return !!wx.getStorageSync(AUTH_LOGOUT_LOCK_KEY);
  } catch (error) {
    return false;
  }
}

function normalizeAuthSession(session = {}) {
  return {
    sessionToken: session.sessionToken || "",
    expiresAt: session.expiresAt || "",
    userId: session.userId || "",
    phoneNumber: session.phoneNumber || "",
    phoneCountryCode: session.phoneCountryCode || "",
    phoneBound: !!session.phoneBound,
  };
}

App({
  globalData: {
    ...DEFAULT_RUNTIME_CONFIG,
    sessionToken: "",
    sessionExpiresAt: "",
    authenticatedUserId: "",
    phoneNumber: "",
    phoneCountryCode: "",
    phoneBound: false,
    logoutLocked: false,
  },

  onLaunch() {
    this.globalData.logoutLocked = loadStoredLogoutLock();
    this.restoreAuthSession();
  },

  getRuntimeConfig() {
    return {
      assessmentId: this.getAssessmentId(),
      apiBaseUrl: normalizeApiBaseUrl(this.globalData.apiBaseUrl),
      assetBaseUrl: normalizeAssetBaseUrl(this.globalData.assetBaseUrl),
      useMock: !!this.globalData.useMock,
      userId: this.globalData.userId || "",
      requestHeaders: {
        ...(this.globalData.requestHeaders || {}),
      },
    };
  },

  setRuntimeConfig(runtimeConfig = {}) {
    const mergedHeaders = {
      ...(this.globalData.requestHeaders || {}),
      ...(runtimeConfig.requestHeaders || {}),
    };

    this.globalData = {
      ...this.globalData,
      ...runtimeConfig,
      apiBaseUrl: normalizeApiBaseUrl(runtimeConfig.apiBaseUrl || this.globalData.apiBaseUrl),
      assetBaseUrl: normalizeAssetBaseUrl(
        runtimeConfig.assetBaseUrl || this.globalData.assetBaseUrl
      ),
      requestHeaders: mergedHeaders,
    };
  },

  getAssessmentId() {
    return this.globalData.assessmentId || DEFAULT_RUNTIME_CONFIG.assessmentId;
  },

  isMockEnabled() {
    const runtimeConfig = this.getRuntimeConfig();
    return !!runtimeConfig.useMock || !runtimeConfig.apiBaseUrl;
  },

  getStoredAuthSnapshot() {
    return {
      sessionToken: this.globalData.sessionToken,
      expiresAt: this.globalData.sessionExpiresAt,
      userId: this.globalData.authenticatedUserId,
      phoneNumber: this.globalData.phoneNumber,
      phoneCountryCode: this.globalData.phoneCountryCode,
      phoneBound: !!this.globalData.phoneBound,
    };
  },

  applyAuthSession(session = {}) {
    const normalizedSession = normalizeAuthSession(session);

    this.globalData.sessionToken = normalizedSession.sessionToken;
    this.globalData.sessionExpiresAt = normalizedSession.expiresAt;
    this.globalData.authenticatedUserId = normalizedSession.userId;
    this.globalData.phoneNumber = normalizedSession.phoneNumber;
    this.globalData.phoneCountryCode = normalizedSession.phoneCountryCode;
    this.globalData.phoneBound = normalizedSession.phoneBound;
    this.authProfileLoaded = true;

    return normalizedSession;
  },

  restoreAuthSession() {
    const storedSession = loadStoredAuthSession();

    if (!storedSession || !storedSession.sessionToken) {
      return;
    }

    if (storedSession.expiresAt && storedSession.expiresAt <= new Date().toISOString()) {
      this.clearAuthSession();
      return;
    }

    this.applyAuthSession(storedSession);
    this.authProfileLoaded = typeof storedSession.phoneBound === "boolean";
  },

  persistAuthSession(session) {
    const normalizedSession = this.applyAuthSession(session);
    wx.setStorageSync(AUTH_STORAGE_KEY, normalizedSession);
    return normalizedSession;
  },

  clearAuthSession() {
    this.globalData.sessionToken = "";
    this.globalData.sessionExpiresAt = "";
    this.globalData.authenticatedUserId = "";
    this.globalData.phoneNumber = "";
    this.globalData.phoneCountryCode = "";
    this.globalData.phoneBound = false;
    this.authProfileLoaded = false;

    try {
      wx.removeStorageSync(AUTH_STORAGE_KEY);
    } catch (error) {
      // Ignore storage cleanup failures during auth reset.
    }
  },

  isLoggedOutLocked() {
    return !!this.globalData.logoutLocked;
  },

  setLoggedOutLock(flag) {
    const locked = !!flag;
    this.globalData.logoutLocked = locked;

    try {
      if (locked) {
        wx.setStorageSync(AUTH_LOGOUT_LOCK_KEY, true);
      } else {
        wx.removeStorageSync(AUTH_LOGOUT_LOCK_KEY);
      }
    } catch (error) {
      // Ignore storage failures and keep runtime state as source of truth.
    }
  },

  async ensureAuthenticated(forceRefresh = false) {
    if (this.isMockEnabled()) {
      return null;
    }

    if (!forceRefresh && this.globalData.sessionToken) {
      return this.getStoredAuthSnapshot();
    }

    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = this.loginWithWeChat().finally(() => {
      this.authPromise = null;
    });

    return this.authPromise;
  },

  requestAuthApi({ url, method = "GET", data, requireSession = true }) {
    const apiBaseUrl = normalizeApiBaseUrl(this.globalData.apiBaseUrl);

    if (!apiBaseUrl) {
      return Promise.reject(new Error("API_BASE_URL_NOT_CONFIGURED"));
    }

    const headers = {
      "content-type": "application/json",
    };

    if (requireSession && this.globalData.sessionToken) {
      headers["x-session-token"] = this.globalData.sessionToken;
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${apiBaseUrl}${url}`,
        method,
        timeout: 12000,
        data,
        header: headers,
        success: (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(response.data || {});
            return;
          }

          if (response.statusCode === 401) {
            this.clearAuthSession();
          }

          reject(response.data || new Error("AUTH_REQUEST_FAILED"));
        },
        fail: (error) => {
          reject(error);
        },
      });
    });
  },

  loginWithWeChat() {
    const apiBaseUrl = normalizeApiBaseUrl(this.globalData.apiBaseUrl);

    if (!apiBaseUrl) {
      return Promise.reject(new Error("API_BASE_URL_NOT_CONFIGURED"));
    }

    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginResult) => {
          if (!loginResult.code) {
            reject(new Error("WECHAT_LOGIN_CODE_MISSING"));
            return;
          }

          this.requestAuthApi({
            url: "/auth/wx-login",
            method: "POST",
            data: {
              code: loginResult.code,
            },
            requireSession: false,
          }).then((result) => {
            this.persistAuthSession(result || {});
            resolve(result);
          }).catch((error) => {
            this.clearAuthSession();
            reject(error);
          });
        },
        fail: (error) => {
          reject(error);
        },
      });
    });
  },

  async ensureUserProfile(forceRefresh = false) {
    if (this.isMockEnabled()) {
      return {
        userId: this.globalData.userId || "demo-user",
        phoneNumber: "",
        phoneCountryCode: "",
        phoneBound: true,
      };
    }

    await this.ensureAuthenticated();

    if (!forceRefresh && this.authProfileLoaded) {
      return this.getStoredAuthSnapshot();
    }

    if (this.profilePromise) {
      return this.profilePromise;
    }

    this.profilePromise = this.requestAuthApi({
      url: "/auth/me",
    }).then((result) => {
      const mergedSession = {
        ...this.getStoredAuthSnapshot(),
        ...(result || {}),
      };

      this.persistAuthSession(mergedSession);
      return mergedSession;
    }).finally(() => {
      this.profilePromise = null;
    });

    return this.profilePromise;
  },

  async bindPhoneNumber(phoneCode) {
    if (this.isMockEnabled()) {
      const mockProfile = {
        ...this.getStoredAuthSnapshot(),
        phoneNumber: "13800000000",
        phoneCountryCode: "86",
        phoneBound: true,
      };

      this.persistAuthSession(mockProfile);
      this.setLoggedOutLock(false);
      return mockProfile;
    }

    if (!phoneCode) {
      throw new Error("PHONE_AUTH_CODE_MISSING");
    }

    await this.ensureAuthenticated();

    const result = await this.requestAuthApi({
      url: "/auth/wx-phone",
      method: "POST",
      data: {
        code: phoneCode,
      },
    });

    const mergedSession = {
      ...this.getStoredAuthSnapshot(),
      ...(result || {}),
    };

    this.persistAuthSession(mergedSession);
    this.setLoggedOutLock(false);
    return mergedSession;
  },

  async ensurePhoneBound(forceRefresh = false) {
    const profile = await this.ensureUserProfile(forceRefresh);
    return !!(profile && profile.phoneBound);
  },

  async logout() {
    if (this.isMockEnabled()) {
      this.clearAuthSession();
      this.setLoggedOutLock(true);
      return {
        success: true,
      };
    }

    let remoteError = null;

    try {
      if (this.globalData.sessionToken) {
        await this.requestAuthApi({
          url: "/auth/logout",
          method: "POST",
          data: {},
        });
      }
    } catch (error) {
      remoteError = error;
    } finally {
      this.clearAuthSession();
      this.setLoggedOutLock(true);
    }

    return {
      success: true,
      remoteError,
    };
  },

  getRequestHeaders() {
    const runtimeConfig = this.getRuntimeConfig();
    const headers = {
      ...runtimeConfig.requestHeaders,
    };

    if (this.globalData.sessionToken) {
      headers["x-session-token"] = this.globalData.sessionToken;
      delete headers["x-user-id"];
      return headers;
    }

    if (!headers["x-user-id"]) {
      if (runtimeConfig.userId) {
        headers["x-user-id"] = runtimeConfig.userId;
      } else if (this.isMockEnabled()) {
        headers["x-user-id"] = "demo-user";
      }
    }

    return headers;
  },
});
