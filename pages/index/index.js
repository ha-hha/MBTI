const api = require("../../services/api");

function getAssessmentId() {
  const app = getApp();
  return app.getAssessmentId();
}

function getDefaultHeroLines() {
  return [
    "这不是给你贴标签，而是帮你识别在 AI 时代最不该被低价出售的能力。",
    "你会看到自己最难被算法替代的判断力、表达力与协作优势。",
    "测完以后，结果会直接告诉你哪些地方该放大，哪些地方该让 AI 补位。",
  ];
}

Page({
  data: {
    loading: true,
    error: false,
    config: null,
    heroLines: [],
    canAutoPlayStories: false,
    trustTags: [],
    proofStats: [],
    insightCards: [],
    transformationCards: [],
    phoneAuthVisible: false,
    phoneAuthSubmitting: false,
    phoneAuthError: "",
    agreementChecked: false,
    confirmModalVisible: false,
  },

  onLoad() {
    this.loadAssessment();
  },

  buildHomeViewModel(config) {
    const heroLines = Array.isArray(config.welcomeCopyPool) && config.welcomeCopyPool.length
      ? config.welcomeCopyPool.slice(0, 4)
      : getDefaultHeroLines();

    return {
      heroLines,
      canAutoPlayStories: heroLines.length > 1,
      trustTags: ["AI 协同定位", "职业升级建议", "支持分享传播"],
      proofStats: [
        {
          value: `${config.questionCount}`,
          label: "关键问题",
          note: "覆盖 4 个核心维度",
        },
        {
          value: "4",
          label: "结果模块",
          note: "直看优势、风险与路径",
        },
        {
          value: "1",
          label: "升级方案",
          note: "聚焦 AI 时代职业跃迁",
        },
      ],
      insightCards: [
        {
          index: "01",
          title: "看清你的人类溢价",
          copy: "你会知道自己哪些判断、洞察与表达方式最难被算法复制。",
        },
        {
          index: "02",
          title: "识别替代风险",
          copy: "报告会直接指出哪些习惯最容易被 AI 降维打击，不绕弯子。",
        },
        {
          index: "03",
          title: "拿到职业升级路径",
          copy: "从 MBTI 类型延伸到 AI 协同、岗位价值与专业认证的下一步建议。",
        },
      ],
      transformationCards: [
        {
          stage: "答题前",
          title: "只有模糊印象",
          copy: "你可能知道自己像哪类人，但还不知道哪些能力最值钱。",
        },
        {
          stage: "答题后",
          title: "得到清晰坐标",
          copy: "你会拿到人格资产、替代风险与职业升级建议三条并行视角。",
        },
      ],
    };
  },

  async loadAssessment() {
    this.setData({ loading: true, error: false });

    try {
      const config = await api.getAssessment(getAssessmentId());
      this.setData({
        config,
        loading: false,
        error: false,
        ...this.buildHomeViewModel(config),
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: true,
      });
      wx.showToast({
        title: "加载失败，请重试",
        icon: "none",
      });
    }
  },

  retryLoad() {
    this.loadAssessment();
  },

  noop() {},

  showPhoneAuthModal() {
    this.setData({
      phoneAuthVisible: true,
      phoneAuthSubmitting: false,
      phoneAuthError: "",
      agreementChecked: false,
      confirmModalVisible: false,
    });
  },

  async startAssessment() {
    this.navigateToQuiz();
  },

  navigateToQuiz() {
    wx.navigateTo({
      url: "/pages/quiz/index",
    });
  },

  closePhoneAuthModal() {
    this.setData({
      phoneAuthVisible: false,
      phoneAuthSubmitting: false,
      phoneAuthError: "",
      agreementChecked: false,
      confirmModalVisible: false,
    });
  },

  toggleAgreement() {
    this.setData({
      agreementChecked: !this.data.agreementChecked,
      phoneAuthError: "",
    });
  },

  handleLoginClick() {
    if (this.data.phoneAuthSubmitting) {
      return;
    }

    if (this.data.agreementChecked) {
      return;
    }

    this.setData({
      confirmModalVisible: true,
      phoneAuthError: "",
    });
  },

  closeConfirmModal() {
    this.setData({
      confirmModalVisible: false,
    });
  },

  markAgreementAccepted() {
    if (!this.data.agreementChecked) {
      this.setData({
        agreementChecked: true,
      });
    }
  },

  openPrivacyGuide() {
    wx.navigateTo({
      url: "/pages/privacy/index",
    });
  },

  async onGetPhoneNumber(event) {
    const detail = event.detail || {};
    const errMsg = detail.errMsg || "";
    const phoneCode = detail.code || "";

    if (errMsg.indexOf(":ok") === -1 || !phoneCode) {
      this.setData({
        phoneAuthSubmitting: false,
        confirmModalVisible: false,
        phoneAuthError: "你已取消手机号授权，暂时无法开始测评。",
      });
      return;
    }

    this.setData({
      phoneAuthSubmitting: true,
      phoneAuthError: "",
      confirmModalVisible: false,
      agreementChecked: true,
    });

    try {
      const app = getApp();
      await app.bindPhoneNumber(phoneCode);
      this.setData({
        phoneAuthVisible: false,
        phoneAuthSubmitting: false,
        phoneAuthError: "",
        confirmModalVisible: false,
        agreementChecked: false,
      });
      this.navigateToQuiz();
    } catch (error) {
      let message = "手机号绑定失败，请稍后重试。";

      if (error && error.code === "PHONE_NUMBER_ALREADY_BOUND") {
        message = "该手机号已绑定其他账号，请更换手机号或联系管理员处理。";
      }

      this.setData({
        phoneAuthSubmitting: false,
        phoneAuthError: message,
        confirmModalVisible: false,
      });
    }
  },

  openHistory() {
    wx.navigateTo({
      url: "/pages/history/index",
    });
  },
});
