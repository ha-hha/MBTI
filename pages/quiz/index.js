const api = require("../../services/api");

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
    answers: {},
  },

  onLoad() {
    this.loadAssessment();
  },

  async loadAssessment() {
    try {
      const config = await api.getAssessment(getAssessmentId());
      this.setData({
        config,
        loading: false,
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
    const { config, currentIndex } = this.data;
    if (!config) {
      return null;
    }
    return config.questions[currentIndex];
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

    this.setData({ answers });
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

    this.setData({
      currentIndex: this.data.currentIndex + 1,
    });
  },

  prevQuestion() {
    if (this.data.currentIndex === 0) {
      return;
    }

    this.setData({
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
