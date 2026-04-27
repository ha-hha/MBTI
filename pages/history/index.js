const api = require("../../services/api");

function getAssessmentId() {
  const app = getApp();
  return app.getAssessmentId();
}

Page({
  data: {
    loading: true,
    items: [],
  },

  onShow() {
    this.loadRecords();
  },

  async loadRecords() {
    this.setData({ loading: true });

    try {
      const result = await api.getRecords(getAssessmentId(), 1, 20);
      this.setData({
        items: result.items,
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

  openRecord(event) {
    const { recordid } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/report/index?recordId=${recordid}`,
    });
  },
});
