const api = require("../../services/api");

function getAssessmentId() {
  const app = getApp();
  return app.getAssessmentId();
}

function getDefaultShareTitle() {
  return "测测你的 MBTI 在 AI 时代值多少钱";
}

Page({
  data: {
    recordId: "",
    loading: true,
    status: "pending",
    report: null,
    config: null,
  },

  onLoad(options) {
    this.loadAssessmentConfig();

    if (!options.recordId) {
      this.setData({
        loading: false,
        status: "failed",
      });

      wx.showToast({
        title: "缺少报告记录",
        icon: "none",
      });
      return;
    }

    this.setData({ recordId: options.recordId });
    this.fetchReport();
  },

  async loadAssessmentConfig() {
    try {
      const config = await api.getAssessment(getAssessmentId());
      this.setData({ config });
    } catch (error) {
      this.setData({ config: null });
    }
  },

  onUnload() {
    this.clearPollTimer();
  },

  clearPollTimer() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  },

  async fetchReport() {
    this.clearPollTimer();

    try {
      const result = await api.getReport(this.data.recordId);

      if (result.status === "pending") {
        this.setData({
          loading: false,
          status: "pending",
          report: null,
        });

        this.pollTimer = setTimeout(() => {
          this.fetchReport();
        }, (result.estimatedRetryAfterSeconds || 2) * 1000);
        return;
      }

      if (result.status === "failed") {
        this.setData({
          loading: false,
          status: "failed",
          report: null,
        });
        return;
      }

      this.setData({
        loading: false,
        status: "ready",
        report: result,
      });
    } catch (error) {
      this.setData({
        loading: false,
        status: "failed",
      });
    }
  },

  retry() {
    this.setData({
      loading: true,
      status: "pending",
      report: null,
    });
    this.fetchReport();
  },

  goHome() {
    wx.reLaunch({
      url: "/pages/index/index",
    });
  },

  getShareTitle() {
    const { config, report } = this.data;

    if (config && Array.isArray(config.shareCopyPool) && config.shareCopyPool.length) {
      return config.shareCopyPool[0];
    }

    if (report && report.mbtiType && report.themeTitle) {
      return `${report.mbtiType}｜${report.themeTitle}`;
    }

    return getDefaultShareTitle();
  },

  onShareAppMessage() {
    return {
      title: this.getShareTitle(),
      path: "/pages/index/index",
    };
  },

  onShareTimeline() {
    return {
      title: this.getShareTitle(),
      query: "",
    };
  },
});
