const api = require("../../services/api");

function getAssessmentId() {
  const app = getApp();
  return app.getAssessmentId();
}

Page({
  data: {
    loading: true,
    config: null,
    heroLines: [],
  },

  onLoad() {
    this.loadAssessment();
  },

  async loadAssessment() {
    this.setData({ loading: true });

    try {
      const config = await api.getAssessment(getAssessmentId());
      this.setData({
        config,
        heroLines: Array.isArray(config.welcomeCopyPool)
          ? config.welcomeCopyPool.slice(0, 3)
          : [],
        loading: false,
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: "加载失败",
        icon: "none",
      });
    }
  },

  startAssessment() {
    wx.navigateTo({
      url: "/pages/quiz/index",
    });
  },

  openHistory() {
    wx.navigateTo({
      url: "/pages/history/index",
    });
  },
});
