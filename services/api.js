const mockBackend = require("./mock-backend");

const REQUEST_TIMEOUT_MS = 12000;

function getRuntimeConfig() {
  const app = getApp();

  if (app && typeof app.getRuntimeConfig === "function") {
    return app.getRuntimeConfig();
  }

  return {
    apiBaseUrl: "",
    useMock: true,
    requestHeaders: {},
  };
}

function getApiBaseUrl() {
  return (getRuntimeConfig().apiBaseUrl || "").replace(/\/+$/, "");
}

function isMockEnabled() {
  const app = getApp();

  if (app && typeof app.isMockEnabled === "function") {
    return app.isMockEnabled();
  }

  const runtimeConfig = getRuntimeConfig();
  return !!runtimeConfig.useMock || !runtimeConfig.apiBaseUrl;
}

function getRequestHeaders() {
  const app = getApp();

  if (app && typeof app.getRequestHeaders === "function") {
    return app.getRequestHeaders();
  }

  return {
    ...(getRuntimeConfig().requestHeaders || {}),
  };
}

async function request({ url, method = "GET", data, requireAuth = true }) {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL_NOT_CONFIGURED");
  }

  const app = getApp();

  if (requireAuth && app && typeof app.ensureAuthenticated === "function") {
    await app.ensureAuthenticated();
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBaseUrl}${url}`,
      method,
      timeout: REQUEST_TIMEOUT_MS,
      data,
      header: {
        "content-type": "application/json",
        ...getRequestHeaders(),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        if (
          res.statusCode === 401 &&
          app &&
          typeof app.clearAuthSession === "function"
        ) {
          app.clearAuthSession();
        }

        reject(res.data || new Error("REQUEST_FAILED"));
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

function getAssessment(assessmentId) {
  if (isMockEnabled()) {
    return mockBackend.getAssessment(assessmentId);
  }
  return request({
    url: `/assessment/${assessmentId}`,
    requireAuth: false,
  });
}

function submitAssessment(assessmentId, answers) {
  if (isMockEnabled()) {
    return mockBackend.submitAssessment(assessmentId, answers);
  }
  return request({
    url: `/assessment/${assessmentId}/submit`,
    method: "POST",
    data: {
      assessmentId,
      answers,
    },
    requireAuth: true,
  });
}

function getReport(recordId) {
  if (isMockEnabled()) {
    return mockBackend.getReport(recordId);
  }
  return request({
    url: `/report/${recordId}`,
    requireAuth: true,
  });
}

function getRecords(assessmentId, page = 1, pageSize = 20) {
  if (isMockEnabled()) {
    return mockBackend.getRecords(assessmentId, page, pageSize);
  }
  return request({
    url: `/assessment/${assessmentId}/records?page=${page}&pageSize=${pageSize}`,
    requireAuth: true,
  });
}

module.exports = {
  getAssessment,
  submitAssessment,
  getReport,
  getRecords,
  getRuntimeConfig,
  isMockEnabled,
};
