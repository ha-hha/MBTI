const api = require("../../services/api");

function getAssessmentId() {
  const app = getApp();
  return app.getAssessmentId();
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

Page({
  data: {
    loading: true,
    items: [],
    latestType: "",
  },

  onShow() {
    this.loadRecords();
  },

  async loadRecords() {
    this.setData({ loading: true });

    try {
      const result = await api.getRecords(getAssessmentId(), 1, 20);
      const items = (result.items || []).map((item, index) => ({
        ...item,
        displayCreatedAt: formatDateTime(item.createdAt),
        isLatest: index === 0,
      }));

      this.setData({
        items,
        latestType: items.length ? items[0].mbtiType : "",
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

  startAssessment() {
    wx.navigateTo({
      url: "/pages/quiz/index",
    });
  },
});
