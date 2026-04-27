const env = require("../config/env");
const { getAssessmentById } = require("../repositories/assessmentRepo");
const {
  getRecordById,
  updateRecordStatus,
  listRecordsByUserAndAssessment,
} = require("../repositories/recordRepo");
const { buildReport } = require("../utils/reportBuilder");
const { createError } = require("../utils/errors");
const { nowIsoString } = require("../utils/time");

const scheduledJobs = new Map();

function getRecordOrThrow(recordId) {
  const record = getRecordById(recordId);

  if (!record) {
    throw createError("RECORD_NOT_FOUND", "record not found", 404);
  }

  return record;
}

function ensureRecordAccess(record, userId) {
  if (record.userId !== userId) {
    throw createError("RECORD_ACCESS_DENIED", "record access denied", 403);
  }
}

function completePendingRecord(recordId) {
  const existingRecord = getRecordById(recordId);

  if (!existingRecord || existingRecord.reportStatus !== "pending") {
    scheduledJobs.delete(recordId);
    return existingRecord;
  }

  const assessment = getAssessmentById(existingRecord.assessmentId);

  if (!assessment) {
    return updateRecordStatus(
      recordId,
      "failed",
      null,
      (existingRecord.llmRetryCount || 0) + 1,
      nowIsoString()
    );
  }

  try {
    const report = buildReport(
      existingRecord.recordId,
      existingRecord.mbtiType,
      assessment.themeTitle,
      assessment.reportTitle
    );

    return updateRecordStatus(
      recordId,
      "ready",
      report,
      existingRecord.llmRetryCount || 0,
      nowIsoString()
    );
  } catch (error) {
    return updateRecordStatus(
      recordId,
      "failed",
      null,
      (existingRecord.llmRetryCount || 0) + 1,
      nowIsoString()
    );
  } finally {
    scheduledJobs.delete(recordId);
  }
}

function scheduleReportGeneration(recordId) {
  if (scheduledJobs.has(recordId)) {
    clearTimeout(scheduledJobs.get(recordId));
  }

  const timer = setTimeout(() => {
    completePendingRecord(recordId);
  }, env.reportDelayMs);

  scheduledJobs.set(recordId, timer);
}

function maybeResolvePendingRecord(record) {
  if (!record || record.reportStatus !== "pending") {
    return record;
  }

  return completePendingRecord(record.recordId);
}

function getReport(recordId, userId) {
  const record = maybeResolvePendingRecord(getRecordOrThrow(recordId));
  ensureRecordAccess(record, userId);

  if (record.reportStatus === "pending") {
    return {
      recordId: record.recordId,
      status: "pending",
      estimatedRetryAfterSeconds: 2,
      updatedAt: record.updatedAt,
    };
  }

  if (record.reportStatus === "failed") {
    return {
      recordId: record.recordId,
      status: "failed",
      errorCode: "REPORT_GENERATION_FAILED",
      userMessageKey: "mbti_report_generation_failed",
      updatedAt: record.updatedAt,
    };
  }

  return {
    recordId: record.recordId,
    status: "ready",
    themeTitle: record.report.themeTitle,
    reportTitle: record.report.reportTitle,
    mbtiType: record.report.mbtiType,
    modules: record.report.modules,
    updatedAt: record.updatedAt,
  };
}

function listHistoryRecords(assessmentId, userId, page, pageSize) {
  const assessment = getAssessmentById(assessmentId);

  if (!assessment) {
    throw createError("ASSESSMENT_NOT_FOUND", "assessment not found", 404);
  }

  const result = listRecordsByUserAndAssessment(userId, assessmentId, page, pageSize);
  const items = result.items.map((item) => maybeResolvePendingRecord(item));
  const startIndex = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    total: result.total,
    hasMore: startIndex + pageSize < result.total,
    items: items.map((item) => ({
      recordId: item.recordId,
      assessmentId: item.assessmentId,
      assessmentName: assessment.name,
      mbtiType: item.mbtiType,
      reportStatus: item.reportStatus,
      createdAt: item.createdAt,
    })),
  };
}

module.exports = {
  scheduleReportGeneration,
  getReport,
  listHistoryRecords,
};
