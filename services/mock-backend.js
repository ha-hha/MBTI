const { assessmentConfig, questions } = require("../utils/assessment-config");
const { createReport } = require("../utils/report-generator");

const STORAGE_KEY = "mbti_records_v1";
const MOCK_DELAY = 300;
const REPORT_DELAY_MS = 1800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadRecords() {
  return wx.getStorageSync(STORAGE_KEY) || [];
}

function saveRecords(records) {
  wx.setStorageSync(STORAGE_KEY, records);
}

function findAssessmentOrThrow(assessmentId) {
  if (assessmentId !== assessmentConfig.id) {
    throw new Error("ASSESSMENT_NOT_FOUND");
  }
  return assessmentConfig;
}

function resolveMbtiType(answers) {
  const questionMap = questions.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const counts = {
    EI: { E: 0, I: 0 },
    SN: { S: 0, N: 0 },
    TF: { T: 0, F: 0 },
    JP: { J: 0, P: 0 },
  };

  answers.forEach((answer) => {
    const question = questionMap[answer.questionId];
    const letter = question.optionLetterMapping[answer.selectedOption];
    counts[question.dimension][letter] += 1;
  });

  const ei = counts.EI.E >= 3 ? "E" : "I";
  const sn = counts.SN.S >= 3 ? "S" : "N";
  const tf = counts.TF.T >= 3 ? "T" : "F";
  const jp = counts.JP.J >= 3 ? "J" : "P";

  return `${ei}${sn}${tf}${jp}`;
}

function validateAnswers(assessmentId, answers) {
  findAssessmentOrThrow(assessmentId);

  if (!Array.isArray(answers) || answers.length !== questions.length) {
    throw new Error("INVALID_ANSWER_COUNT");
  }

  const questionIds = new Set();
  const validQuestionMap = questions.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  answers.forEach((answer) => {
    if (!validQuestionMap[answer.questionId]) {
      throw new Error("INVALID_QUESTION_ID");
    }
    if (questionIds.has(answer.questionId)) {
      throw new Error("DUPLICATE_QUESTION_ID");
    }
    if (answer.selectedOption !== "A" && answer.selectedOption !== "B") {
      throw new Error("INVALID_SELECTED_OPTION");
    }
    questionIds.add(answer.questionId);
  });
}

function generateRecordId() {
  return `rpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function getCurrentUserId() {
  const app = getApp();
  return app.globalData.userId || "demo-user";
}

function refreshPendingRecord(record) {
  if (record.reportStatus !== "pending") {
    return record;
  }

  if (Date.now() - record.createdAtMs < REPORT_DELAY_MS) {
    return record;
  }

  record.reportStatus = "ready";
  record.updatedAt = new Date().toISOString();
  record.report = createReport(
    record.recordId,
    record.mbtiType,
    assessmentConfig.themeTitle,
    assessmentConfig.reportTitle
  );

  return record;
}

async function getAssessment(assessmentId) {
  await sleep(MOCK_DELAY);
  return findAssessmentOrThrow(assessmentId);
}

async function submitAssessment(assessmentId, answers) {
  await sleep(MOCK_DELAY);
  validateAnswers(assessmentId, answers);

  const record = {
    recordId: generateRecordId(),
    assessmentId,
    userId: getCurrentUserId(),
    answers,
    mbtiType: resolveMbtiType(answers),
    reportStatus: "pending",
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdAtMs: Date.now(),
    report: null,
  };

  const records = loadRecords();
  records.unshift(record);
  saveRecords(records);

  return {
    recordId: record.recordId,
    assessmentId: record.assessmentId,
    mbtiType: record.mbtiType,
    reportStatus: record.reportStatus,
    submittedAt: record.submittedAt,
  };
}

async function getReport(recordId) {
  await sleep(MOCK_DELAY);

  const records = loadRecords();
  const record = records.find((item) => item.recordId === recordId);

  if (!record) {
    throw new Error("RECORD_NOT_FOUND");
  }

  if (record.userId !== getCurrentUserId()) {
    throw new Error("RECORD_ACCESS_DENIED");
  }

  refreshPendingRecord(record);
  saveRecords(records);

  if (record.reportStatus === "pending") {
    return {
      recordId,
      status: "pending",
      estimatedRetryAfterSeconds: 2,
      updatedAt: record.updatedAt,
    };
  }

  if (record.reportStatus === "failed") {
    return {
      recordId,
      status: "failed",
      errorCode: "REPORT_GENERATION_FAILED",
      userMessageKey: "mbti_report_generation_failed",
      updatedAt: record.updatedAt,
    };
  }

  return {
    status: "ready",
    updatedAt: record.updatedAt,
    ...record.report,
  };
}

async function getRecords(assessmentId, page, pageSize) {
  await sleep(MOCK_DELAY);
  findAssessmentOrThrow(assessmentId);

  const currentUserId = getCurrentUserId();
  const allRecords = loadRecords();

  allRecords.forEach((item) => {
    if (item.userId === currentUserId && item.assessmentId === assessmentId) {
      refreshPendingRecord(item);
    }
  });

  saveRecords(allRecords);

  const records = allRecords.filter(
    (item) =>
      item.userId === currentUserId &&
      item.assessmentId === assessmentId &&
      item.reportStatus !== "failed"
  );

  const startIndex = (page - 1) * pageSize;
  const sliced = records.slice(startIndex, startIndex + pageSize);

  return {
    page,
    pageSize,
    total: records.length,
    hasMore: startIndex + pageSize < records.length,
    items: sliced.map((item) => ({
      recordId: item.recordId,
      assessmentId: item.assessmentId,
      assessmentName: assessmentConfig.name,
      mbtiType: item.mbtiType,
      reportStatus: item.reportStatus,
      createdAt: item.createdAt,
    })),
  };
}

module.exports = {
  getAssessment,
  submitAssessment,
  getReport,
  getRecords,
};
