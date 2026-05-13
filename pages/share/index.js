const api = require("../../services/api");

const DEFAULT_REMOTE_MBTI_IMAGE_ROOT = "https://mbti.pinggu.com/static/mbti";
const DEFAULT_THEME_TITLE = "MBTI职业性格测评";
const DEFAULT_REPORT_TITLE = "看清你在 AI 时代最有价值的人类溢价";

function decodeValue(value) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function getAssessmentId() {
  const app = getApp();
  return app.getAssessmentId();
}

function getMbtiImageRoot() {
  const app = getApp();

  if (app && typeof app.getRuntimeConfig === "function") {
    const runtimeConfig = app.getRuntimeConfig();

    if (runtimeConfig && runtimeConfig.assetBaseUrl) {
      return `${runtimeConfig.assetBaseUrl}/static/mbti`;
    }
  }

  return DEFAULT_REMOTE_MBTI_IMAGE_ROOT;
}

function getMbtiImage(mbtiType) {
  if (!mbtiType) {
    return "";
  }

  return `${getMbtiImageRoot()}/${mbtiType.toLowerCase()}.png`;
}

function encodeShareValue(value) {
  return encodeURIComponent(value || "");
}

Page({
  data: {
    loading: true,
    themeTitle: DEFAULT_THEME_TITLE,
    reportTitle: DEFAULT_REPORT_TITLE,
    mbtiType: "",
    mbtiImage: "",
    highlightPoints: [
      "识别你最难被 AI 替代的人类优势",
      "直观看到你的职业升级方向",
      "完成测试即可获得完整个人报告",
    ],
  },

  onLoad(options) {
    this.shouldHydrateThemeTitle = !options.themeTitle;
    this.shouldHydrateReportTitle = !options.reportTitle;

    const themeTitle = decodeValue(options.themeTitle) || DEFAULT_THEME_TITLE;
    const reportTitle = decodeValue(options.reportTitle) || DEFAULT_REPORT_TITLE;
    const mbtiType = decodeValue(options.mbtiType).toUpperCase();

    this.setData({
      loading: false,
      themeTitle,
      reportTitle,
      mbtiType,
      mbtiImage: getMbtiImage(mbtiType),
    });

    if (this.shouldHydrateThemeTitle || this.shouldHydrateReportTitle) {
      this.loadAssessmentConfig();
    }
  },

  async loadAssessmentConfig() {
    try {
      const config = await api.getAssessment(getAssessmentId());
      this.setData({
        themeTitle: this.shouldHydrateThemeTitle
          ? (config.themeTitle || DEFAULT_THEME_TITLE)
          : this.data.themeTitle,
        reportTitle: this.shouldHydrateReportTitle
          ? (config.startCopy || DEFAULT_REPORT_TITLE)
          : this.data.reportTitle,
      });
    } catch (error) {
      // Keep current fallback content.
    }
  },

  startAssessment() {
    const app = getApp();

    if (
      app &&
      typeof app.isLoggedOutLocked === "function" &&
      app.isLoggedOutLocked()
    ) {
      wx.reLaunch({
        url: "/pages/index/index",
      });
      return;
    }

    wx.navigateTo({
      url: "/pages/quiz/index",
    });
  },

  goHome() {
    wx.reLaunch({
      url: "/pages/index/index",
    });
  },

  getShareTitle() {
    if (this.data.mbtiType) {
      return `${this.data.themeTitle} · ${this.data.mbtiType}`;
    }

    return this.data.themeTitle || DEFAULT_THEME_TITLE;
  },

  getSharePath() {
    const { themeTitle, reportTitle, mbtiType } = this.data;

    return `/pages/share/index?themeTitle=${encodeShareValue(themeTitle)}&reportTitle=${encodeShareValue(reportTitle)}&mbtiType=${encodeShareValue(mbtiType)}`;
  },

  onShareAppMessage() {
    return {
      title: this.getShareTitle(),
      path: this.getSharePath(),
      imageUrl: this.data.mbtiImage,
    };
  },

  onShareTimeline() {
    return {
      title: this.getShareTitle(),
      query: this.getSharePath().split("?")[1] || "",
      imageUrl: this.data.mbtiImage,
    };
  },
});
