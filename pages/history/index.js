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

function isLoggedOutLocked(app) {
  return (
    !!app &&
    typeof app.isLoggedOutLocked === "function" &&
    app.isLoggedOutLocked()
  );
}

Page({
  data: {
    loading: true,
    items: [],
    latestType: "",
    logoutSubmitting: false,
    loggedOutLocked: false,
  },

  onShow() {
    const app = getApp();

    if (isLoggedOutLocked(app)) {
      this.setData({
        loading: false,
        items: [],
        latestType: "",
        loggedOutLocked: true,
      });
      return;
    }

    this.setData({
      loggedOutLocked: false,
    });
    this.loadRecords();
  },

  async loadRecords() {
    const app = getApp();

    if (isLoggedOutLocked(app)) {
      this.setData({
        loading: false,
        items: [],
        latestType: "",
        loggedOutLocked: true,
      });
      return;
    }

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
        loggedOutLocked: false,
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
    if (this.data.loggedOutLocked) {
      return;
    }

    const { recordid } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/package-report/pages/report/index?recordId=${recordid}`,
    });
  },

  startAssessment() {
    if (this.data.loggedOutLocked) {
      wx.reLaunch({
        url: "/pages/index/index",
      });
      return;
    }

    wx.navigateTo({
      url: "/pages/quiz/index",
    });
  },

  handleLogout() {
    if (this.data.logoutSubmitting) {
      return;
    }

    wx.showModal({
      title: "退出登录",
      content: "退出后会清空当前本地登录态，下次进入需要重新完成授权。",
      confirmText: "退出",
      cancelText: "取消",
      success: async (result) => {
        if (!result.confirm) {
          return;
        }

        this.setData({
          logoutSubmitting: true,
        });

        try {
          const app = getApp();
          await app.logout();
          this.setData({
            items: [],
            latestType: "",
            loggedOutLocked: true,
            loading: false,
          });

          wx.showToast({
            title: "已退出登录",
            icon: "success",
          });

          setTimeout(() => {
            wx.reLaunch({
              url: "/pages/index/index",
            });
          }, 500);
        } finally {
          this.setData({
            logoutSubmitting: false,
          });
        }
      },
    });
  },
});
