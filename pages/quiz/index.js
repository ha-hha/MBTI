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
    hint: "观察你在复杂选择中更偏逻辑校验，还是更关注关系与价值影响。",
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
  },

  onLoad() {
    this.loadAssessment();
  },

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
      ? Math.round(((currentIndex + 1) / config.questionCount) * 100)
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

  selectOption(event) {
    const { option } = event.currentTarget.dataset;
    const currentQuestion = this.getCurrentQuestion();

    if (!currentQuestion) {
      return;
    }

    const answers = {
      ...this.data.answers,
      [currentQuestion.id]: option,
    };

    this.syncViewState({ answers });
  },

  nextQuestion() {
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
      this.submitAnswers();
      return;
    }

    this.syncViewState({
      currentIndex: this.data.currentIndex + 1,
    });
  },

  prevQuestion() {
    if (this.data.currentIndex === 0) {
      return;
    }

    this.syncViewState({
      currentIndex: this.data.currentIndex - 1,
    });
  },

  async submitAnswers() {
    if (this.data.submitting) {
      return;
    }

    const answerEntries = Object.entries(this.data.answers);

    if (answerEntries.length !== this.data.config.questions.length) {
      wx.showToast({
        title: "请完成全部题目",
        icon: "none",
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      const payload = this.data.config.questions.map((question) => ({
        questionId: question.id,
        selectedOption: this.data.answers[question.id],
      }));

      const result = await api.submitAssessment(getAssessmentId(), payload);

      wx.redirectTo({
        url: `/pages/report/index?recordId=${result.recordId}`,
      });
    } catch (error) {
      wx.showToast({
        title: "提交失败，请重试",
        icon: "none",
      });
      this.setData({ submitting: false });
    }
  },
});
