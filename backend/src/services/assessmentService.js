const { getAssessmentById } = require("../repositories/assessmentRepo");
const { createRecord } = require("../repositories/recordRepo");
const { resolveMbtiType } = require("../utils/mbtiResolver");
const { createError } = require("../utils/errors");
const { nowIsoString } = require("../utils/time");
const reportService = require("./reportService");

function ensureAssessmentId(assessmentId) {
  if (assessmentId !== "mbti_ai_value") {
    throw createError("INVALID_ASSESSMENT_ID", "invalid assessment id", 400);
  }
}

function getAssessmentOrThrow(assessmentId) {
  ensureAssessmentId(assessmentId);
  const assessment = getAssessmentById(assessmentId);

  if (!assessment) {
    throw createError("ASSESSMENT_NOT_FOUND", "assessment not found", 404);
  }

  return assessment;
}

function validateAnswers(assessment, assessmentId, bodyAssessmentId, answers) {
  if (bodyAssessmentId !== assessmentId) {
    throw createError("INVALID_ASSESSMENT_ID", "assessmentId in body must match path id", 400);
  }

  if (!Array.isArray(answers) || answers.length !== assessment.questions.length) {
    throw createError("INVALID_ANSWER_COUNT", "answers count must be exactly 20", 400);
  }

  const questionMap = assessment.questions.reduce((accumulator, question) => {
    accumulator[question.id] = question;
    return accumulator;
  }, {});

  const seenQuestionIds = new Set();

  answers.forEach((answer) => {
    if (!questionMap[answer.questionId]) {
      throw createError("INVALID_QUESTION_ID", "questionId is not in assessment question bank", 400);
    }

    if (seenQuestionIds.has(answer.questionId)) {
      throw createError("DUPLICATE_QUESTION_ID", "questionId duplicated in answers", 400);
    }

    if (answer.selectedOption !== "A" && answer.selectedOption !== "B") {
      throw createError("INVALID_SELECTED_OPTION", "selectedOption must be A or B", 400);
    }

    seenQuestionIds.add(answer.questionId);
  });
}

function generateRecordId() {
  return `rpt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function getAssessmentConfig(assessmentId) {
  return getAssessmentOrThrow(assessmentId);
}

function submitAssessment(assessmentId, bodyAssessmentId, answers, userId) {
  const assessment = getAssessmentOrThrow(assessmentId);
  validateAnswers(assessment, assessmentId, bodyAssessmentId, answers);

  const mbtiType = resolveMbtiType(assessment.questions, answers);
  const now = nowIsoString();

  const record = createRecord({
    recordId: generateRecordId(),
    assessmentId,
    userId,
    answers,
    mbtiType,
    reportStatus: "pending",
    report: null,
    llmRetryCount: 0,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  reportService.scheduleReportGeneration(record.recordId);

  return {
    recordId: record.recordId,
    assessmentId: record.assessmentId,
    mbtiType: record.mbtiType,
    reportStatus: record.reportStatus,
    submittedAt: record.submittedAt,
  };
}

module.exports = {
  getAssessmentConfig,
  submitAssessment,
  getAssessmentOrThrow,
};
