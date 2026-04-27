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

function request({ url, method = "GET", data }) {
  return new Promise((resolve, reject) => {
    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl) {
      reject(new Error("API_BASE_URL_NOT_CONFIGURED"));
      return;
    }

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
  return request({ url: `/assessment/${assessmentId}` });
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
  });
}

function getReport(recordId) {
  if (isMockEnabled()) {
    return mockBackend.getReport(recordId);
  }
  return request({ url: `/report/${recordId}` });
}

function getRecords(assessmentId, page = 1, pageSize = 20) {
  if (isMockEnabled()) {
    return mockBackend.getRecords(assessmentId, page, pageSize);
  }
  return request({
    url: `/assessment/${assessmentId}/records?page=${page}&pageSize=${pageSize}`,
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
