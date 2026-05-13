const api = require("../../services/api");

const DIMENSION_META = {
  EI: {
    label: "能量获取",
    hint: "观察你更依赖外部互动，还是更习惯通过独处沉淀恢复判断力。",
  },
  SN: {
    label: "信息处理",
    hint: "观察你更相信可验证事实，还是更容易捕捉趋势、模式与可能性。",
  },
  TF: {
    label: "决策方式",
    hint: "观察你在复杂选择中更偏重逻辑校验，还是更关注关系与价值影响。",
  },
  JP: {
    label: "行动节奏",
    hint: "观察你在不确定环境中更依赖明确规划，还是更擅长灵活推进。",
  },
};

function getAssessmentId() {
  const app = getApp();
  return app.getAssessmentId();
}

function isLoggedOutLocked(app) {
  return (
    !!app &&
    typeof app.isLoggedOutLocked === "function" &&
    app.isLoggedOutLocked()
  );
}

function getPhoneAuthInitialState() {
  return {
    phoneAuthVisible: false,
    phoneAuthSubmitting: false,
    phoneAuthError: "",
    agreementChecked: false,
    confirmModalVisible: false,
  };
}

Page({
  data: {
    loading: true,
    submitting: false,
    config: null,
    currentIndex: 0,
    currentQuestion: null,
    currentDimensionLabel: "",
    currentDimensionHint: "",
    currentAnswer: "",
    answers: {},
    answeredCount: 0,
    remainingCount: 0,
    progressPercent: 0,
    ...getPhoneAuthInitialState(),
  },

  onLoad() {
    this.loadAssessment();
  },

  noop() {},

  syncViewState(overrides = {}) {
    const config = Object.prototype.hasOwnProperty.call(overrides, "config")
      ? overrides.config
      : this.data.config;
    const currentIndex = Object.prototype.hasOwnProperty.call(overrides, "currentIndex")
      ? overrides.currentIndex
      : this.data.currentIndex;
    const answers = Object.prototype.hasOwnProperty.call(overrides, "answers")
      ? overrides.answers
      : this.data.answers;
    const currentQuestion = config ? config.questions[currentIndex] : null;
    const answeredCount = Object.keys(answers || {}).length;
    const remainingCount = config ? Math.max(config.questionCount - answeredCount, 0) : 0;
    const progressPercent = config
      ? Math.round((answeredCount / config.questionCount) * 100)
      : 0;
    const dimensionMeta = currentQuestion ? DIMENSION_META[currentQuestion.dimension] : null;

    this.setData({
      ...overrides,
      currentQuestion,
      currentDimensionLabel: dimensionMeta ? dimensionMeta.label : "",
      currentDimensionHint: dimensionMeta ? dimensionMeta.hint : "",
      currentAnswer: currentQuestion ? answers[currentQuestion.id] || "" : "",
      answeredCount,
      remainingCount,
      progressPercent,
    });
  },

  async loadAssessment() {
    try {
      const config = await api.getAssessment(getAssessmentId());
      this.syncViewState({
        config,
        loading: false,
        currentIndex: 0,
        answers: {},
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: "题目加载失败",
        icon: "none",
      });
    }
  },

  getCurrentQuestion() {
    return this.data.currentQuestion;
  },

  hasCompletedAnswers() {
    return (
      !!this.data.config &&
      Object.keys(this.data.answers || {}).length === this.data.config.questions.length
    );
  },

  buildAnswerPayload() {
    return this.data.config.questions.map((question) => ({
      questionId: question.id,
      selectedOption: this.data.answers[question.id],
    }));
  },

  validateCompletedAnswers() {
    if (!this.data.config || !this.hasCompletedAnswers()) {
      wx.showToast({
        title: "请完成全部题目",
        icon: "none",
      });
      return false;
    }

    return true;
  },

  selectOption(event) {
    const { option } = event.currentTarget.dataset;
    const currentQuestion = this.getCurrentQuestion();

    if (!currentQuestion || this.data.submitting || this.data.phoneAuthSubmitting) {
      return;
    }

    const answers = {
      ...this.data.answers,
      [currentQuestion.id]: option,
    };

    this.syncViewState({ answers });
  },

  nextQuestion() {
    if (this.data.submitting || this.data.phoneAuthSubmitting) {
      return;
    }

    const currentQuestion = this.getCurrentQuestion();

    if (!currentQuestion) {
      return;
    }

    if (!this.data.answers[currentQuestion.id]) {
      wx.showToast({
        title: "请先选择一个答案",
        icon: "none",
      });
      return;
    }

    if (this.data.currentIndex >= this.data.config.questions.length - 1) {
      this.handleGenerateReport();
      return;
    }

    this.syncViewState({
      currentIndex: this.data.currentIndex + 1,
    });
  },

  prevQuestion() {
    if (this.data.submitting || this.data.phoneAuthSubmitting || this.data.currentIndex === 0) {
      return;
    }

    this.syncViewState({
      currentIndex: this.data.currentIndex - 1,
    });
  },

  showPhoneAuthModal() {
    this.setData({
      ...getPhoneAuthInitialState(),
      phoneAuthVisible: true,
    });
  },

  closePhoneAuthModal() {
    if (this.data.phoneAuthSubmitting || this.data.submitting) {
      return;
    }

    this.setData({
      ...getPhoneAuthInitialState(),
    });
  },

  toggleAgreement() {
    if (this.data.phoneAuthSubmitting) {
      return;
    }

    this.setData({
      agreementChecked: !this.data.agreementChecked,
      phoneAuthError: "",
    });
  },

  handleLoginClick() {
    if (this.data.phoneAuthSubmitting || this.data.submitting) {
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
    if (this.data.phoneAuthSubmitting) {
      return;
    }

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

  async handleGenerateReport() {
    if (!this.validateCompletedAnswers() || this.data.submitting || this.data.phoneAuthSubmitting) {
      return;
    }

    const app = getApp();

    if (!app || typeof app.ensurePhoneBound !== "function") {
      await this.submitAnswers();
      return;
    }

    if (isLoggedOutLocked(app)) {
      this.showPhoneAuthModal();
      return;
    }

    try {
      const phoneBound = await app.ensurePhoneBound();

      if (phoneBound) {
        await this.submitAnswers();
        return;
      }

      this.showPhoneAuthModal();
    } catch (error) {
      wx.showToast({
        title: "完成手机号授权后即可生成报告",
        icon: "none",
      });
    }
  },

  async submitAnswers() {
    if (!this.validateCompletedAnswers() || this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });

    try {
      const result = await api.submitAssessment(getAssessmentId(), this.buildAnswerPayload());

      wx.redirectTo({
        url: `/package-report/pages/report/index?recordId=${result.recordId}`,
      });
    } catch (error) {
      wx.showToast({
        title: "提交失败，请重试",
        icon: "none",
      });
      this.setData({ submitting: false });
    }
  },

  async onGetPhoneNumber(event) {
    const detail = event.detail || {};
    const errMsg = detail.errMsg || "";
    const phoneCode = detail.code || "";

    if (errMsg.indexOf(":ok") === -1 || !phoneCode) {
      this.setData({
        phoneAuthSubmitting: false,
        confirmModalVisible: false,
        phoneAuthError: "你已取消手机号授权，当前答题内容已保留，可稍后继续生成报告",
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
        ...getPhoneAuthInitialState(),
      });
      await this.submitAnswers();
    } catch (error) {
      let message = "手机号绑定失败，请稍后重试";

      if (error && error.code === "PHONE_NUMBER_ALREADY_BOUND") {
        message = "该手机号已绑定其他账号，请更换手机号或联系管理员处理";
      }

      this.setData({
        phoneAuthSubmitting: false,
        phoneAuthError: message,
        confirmModalVisible: false,
      });
    }
  },
});
