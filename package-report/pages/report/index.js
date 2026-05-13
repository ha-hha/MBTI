const api = require("../../../services/api");

const CONSULTANT_QR = "/package-report/assets/brand/caie-qrcode.png";
const MINI_PROGRAM_CODE = "/package-report/assets/brand/miniprogram-code.png";
const COMPANY_LOGO = "/package-report/assets/brand/logo.png";
const DEFAULT_REMOTE_MBTI_IMAGE_ROOT = "https://mbti.pinggu.com/static/mbti";
const DEFAULT_SHARE_THEME_TITLE = "MBTI职业性格测评";
const DEFAULT_SHARE_REPORT_TITLE = "看清你在 AI 时代最有价值的人类溢价";

function getAssessmentId() {
  const app = getApp();
  return app.getAssessmentId();
}

function getDefaultShareTitle() {
  return "MBTI职业性格测评";
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

function buildActionSteps() {
  return [
    {
      index: "01",
      title: "锁定你的人类护城河",
      copy: "先识别报告里最不该被低价出售的判断力、洞察力与协作方式。",
    },
    {
      index: "02",
      title: "让 AI 补足你的短板",
      copy: "把重复整理、信息归纳与结构输出交给 AI，把人留给高价值决策。",
    },
    {
      index: "03",
      title: "把优势转成职业跃迁",
      copy: "把性格资产继续落到岗位升级、专业认证与长期竞争力建设上。",
    },
  ];
}

function buildMbtiVisualCard(report) {
  return {
    image: getMbtiImage(report.mbtiType),
    mbtiType: report.mbtiType,
    intro: `你的 MBTI 类型是 ${report.mbtiType}`,
  };
}

function buildConsultingCard() {
  return {
    qrCode: CONSULTANT_QR,
    title: "添加注册人工智能工程师 CAIE 官方顾问",
    copy: "一对一沟通学习培训计划，开启 AI 学习之旅。",
  };
}

function buildBottomBrandCard() {
  return {
    consultantQr: CONSULTANT_QR,
    miniProgramCode: MINI_PROGRAM_CODE,
    companyLogo: COMPANY_LOGO,
    miniProgramCopy: "扫描小程序码，立刻进行测试",
    brandCopy: "本报告由 CAIE 人工智能研究院提供",
  };
}

function buildReportViewModel(report) {
  const modules = Array.isArray(report.modules) ? report.modules : [];
  const assetOverviewModule = modules.length ? modules[0] : null;
  const remainingModules = modules.slice(1).map((module, index) => ({
    index: `0${index + 2}`,
    title: module.title,
    lead: Array.isArray(module.items) && module.items.length ? module.items[0] : "",
    points: Array.isArray(module.items) ? module.items.slice(1) : [],
  }));

  return {
    reportMetrics: [
      {
        label: "报告结构",
        value: `${modules.length}`,
        title: "多模块深度解读",
        copy: "从人格资产、替代风险到职业跃迁建议，逐层展开你的分析结果。",
      },
      {
        label: "行动方案",
        value: "3",
        title: "三步升级路径",
        copy: "围绕护城河识别、AI 协同和职业进阶，给你更清晰的下一步。",
      },
    ],
    assetOverviewModule: assetOverviewModule
      ? {
          index: "01",
          title: assetOverviewModule.title,
          lead: Array.isArray(assetOverviewModule.items) && assetOverviewModule.items.length
            ? assetOverviewModule.items[0]
            : "",
          points: Array.isArray(assetOverviewModule.items)
            ? assetOverviewModule.items.slice(1)
            : [],
        }
      : null,
    mbtiVisualCard: buildMbtiVisualCard(report),
    consultingCard: buildConsultingCard(),
    moduleCards: remainingModules,
    actionSteps: buildActionSteps(),
    bottomBrandCard: buildBottomBrandCard(),
  };
}

Page({
  data: {
    recordId: "",
    loading: true,
    status: "pending",
    report: null,
    config: null,
    reportMetrics: [],
    assetOverviewModule: null,
    mbtiVisualCard: null,
    consultingCard: null,
    moduleCards: [],
    actionSteps: [],
    bottomBrandCard: null,
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

  setReadyReport(report) {
    this.setData({
      loading: false,
      status: "ready",
      report,
      ...buildReportViewModel(report),
    });
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
        }, (result.estimatedRetryAfterSeconds || 1) * 1000);
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

      this.setReadyReport(result);
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
      reportMetrics: [],
      assetOverviewModule: null,
      mbtiVisualCard: null,
      consultingCard: null,
      moduleCards: [],
      actionSteps: [],
      bottomBrandCard: null,
    });
    this.fetchReport();
  },

  goHome() {
    wx.reLaunch({
      url: "/pages/index/index",
    });
  },

  getShareThemeTitle() {
    const { config, report } = this.data;

    return (report && report.themeTitle)
      || (config && config.themeTitle)
      || DEFAULT_SHARE_THEME_TITLE;
  },

  getShareReportTitle() {
    const { report } = this.data;

    return (report && report.reportTitle) || DEFAULT_SHARE_REPORT_TITLE;
  },

  getShareTitle() {
    const { report } = this.data;

    if (report && report.mbtiType) {
      return `${this.getShareThemeTitle()} · ${report.mbtiType}`;
    }

    return this.getShareThemeTitle() || getDefaultShareTitle();
  },

  getSharePath() {
    const { report } = this.data;
    const themeTitle = this.getShareThemeTitle();
    const reportTitle = this.getShareReportTitle();
    const mbtiType = report && report.mbtiType ? report.mbtiType : "";

    return `/pages/share/index?themeTitle=${encodeShareValue(themeTitle)}&reportTitle=${encodeShareValue(reportTitle)}&mbtiType=${encodeShareValue(mbtiType)}`;
  },

  getShareImage() {
    const { report } = this.data;

    if (!report || !report.mbtiType) {
      return "";
    }

    return getMbtiImage(report.mbtiType);
  },

  onShareAppMessage() {
    return {
      title: this.getShareTitle(),
      path: this.getSharePath(),
      imageUrl: this.getShareImage(),
    };
  },

  onShareTimeline() {
    return {
      title: this.getShareTitle(),
      query: this.getSharePath().split("?")[1] || "",
      imageUrl: this.getShareImage(),
    };
  },
});
