const DEFAULT_RUNTIME_CONFIG = {
  assessmentId: "mbti_ai_value",
  apiBaseUrl: "",
  useMock: false,
  userId: "",
  requestHeaders: {},
};

App({
  globalData: {
  assessmentId: "mbti_ai_value",
  apiBaseUrl: "http://127.0.0.1:3000",
  useMock: false,
  userId: "demo-user",
  requestHeaders: {
    "x-user-id": "demo-user",
  },
},

  getRuntimeConfig() {
    return {
      assessmentId: this.getAssessmentId(),
      apiBaseUrl: (this.globalData.apiBaseUrl || "").replace(/\/+$/, ""),
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

  getRequestHeaders() {
    const runtimeConfig = this.getRuntimeConfig();
    const headers = {
      ...runtimeConfig.requestHeaders,
    };

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
