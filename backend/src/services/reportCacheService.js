const { getCachedReportByType, upsertCachedReport } = require("../repositories/reportCacheRepo");
const { listLatestReadyRecordsByAssessment } = require("../repositories/recordRepo");
const { buildReportFromModules } = require("../utils/reportBuilder");
const { nowIsoString } = require("../utils/time");

function getCachedReport(assessment, recordId, mbtiType) {
  const cachedEntry = getCachedReportByType(assessment.id, mbtiType);

  if (!cachedEntry) {
    return null;
  }

  return {
    report: buildReportFromModules(
      recordId,
      mbtiType,
      assessment.themeTitle,
      assessment.reportTitle,
      cachedEntry.modules
    ),
    source: cachedEntry.source,
    llmProvider: cachedEntry.llmProvider,
    llmModel: cachedEntry.llmModel,
    llmPromptVersion: cachedEntry.llmPromptVersion,
  };
}

function saveCachedReport(assessmentId, mbtiType, report, metadata = {}) {
  const now = nowIsoString();

  return upsertCachedReport({
    assessmentId,
    mbtiType,
    source: metadata.source || "template",
    modules: report.modules,
    llmProvider: metadata.llmProvider || null,
    llmModel: metadata.llmModel || null,
    llmPromptVersion: metadata.llmPromptVersion || null,
    createdAt: now,
    updatedAt: now,
  });
}

function warmCacheFromReadyRecords(assessmentId) {
  const latestReadyRecords = listLatestReadyRecordsByAssessment(assessmentId);

  latestReadyRecords.forEach((record) => {
    if (!record.report || !record.report.modules) {
      return;
    }

    if (getCachedReportByType(assessmentId, record.mbtiType)) {
      return;
    }

    saveCachedReport(assessmentId, record.mbtiType, record.report, {
      source: record.llmRawResponse ? "llm" : "historical_ready",
      llmProvider: record.llmProvider,
      llmModel: record.llmModel,
      llmPromptVersion: record.llmPromptVersion,
    });
  });
}

module.exports = {
  getCachedReport,
  saveCachedReport,
  warmCacheFromReadyRecords,
};
