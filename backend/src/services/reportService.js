const { getAssessmentById } = require("../repositories/assessmentRepo");
const {
  getRecordById,
  updateRecordGeneration,
  listRecordsByUserAndAssessment,
} = require("../repositories/recordRepo");
const { buildReport } = require("../utils/reportBuilder");
const { generateReportWithLlm } = require("./llmReportService");
const reportCacheService = require("./reportCacheService");
const { createError } = require("../utils/errors");
const { nowIsoString } = require("../utils/time");
const env = require("../config/env");

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
  return completePendingRecordAsync(recordId);
}

async function completePendingRecordAsync(recordId) {
  const existingRecord = getRecordById(recordId);

  if (!existingRecord || existingRecord.reportStatus !== "pending") {
    scheduledJobs.delete(recordId);
    return existingRecord;
  }

  const assessment = getAssessmentById(existingRecord.assessmentId);

  if (!assessment) {
    return updateRecordGeneration(recordId, {
      reportStatus: "failed",
      report: null,
      llmRetryCount: (existingRecord.llmRetryCount || 0) + 1,
      updatedAt: nowIsoString(),
      llmErrorMessage: "assessment not found during report generation",
      llmFinishedAt: nowIsoString(),
    });
  }

  try {
    const generationResult = await generateReportResult(existingRecord, assessment);
    persistReportCache(existingRecord.assessmentId, existingRecord.mbtiType, generationResult);

    return updateRecordGeneration(recordId, {
      reportStatus: "ready",
      report: generationResult.report,
      llmRetryCount: existingRecord.llmRetryCount || 0,
      updatedAt: nowIsoString(),
      llmProvider: generationResult.llmProvider || null,
      llmModel: generationResult.llmModel || null,
      llmPromptVersion: generationResult.llmPromptVersion || null,
      llmRawResponse: generationResult.llmRawResponse || null,
      llmFinishedAt: nowIsoString(),
      llmErrorMessage: null,
    });
  } catch (error) {
    if (env.llmFallbackToTemplate) {
      try {
        const fallbackReport = buildTemplateReport(existingRecord, assessment);
        const fallbackResult = {
          report: fallbackReport,
          source: "template_fallback",
          llmProvider: env.reportGenerationMode === "llm" ? env.llmProvider : null,
          llmModel: env.reportGenerationMode === "llm" ? env.llmModel : null,
          llmPromptVersion: env.reportGenerationMode === "llm" ? env.llmPromptVersion : null,
        };
        persistReportCache(existingRecord.assessmentId, existingRecord.mbtiType, fallbackResult);

        return updateRecordGeneration(recordId, {
          reportStatus: "ready",
          report: fallbackResult.report,
          llmRetryCount: (existingRecord.llmRetryCount || 0) + 1,
          updatedAt: nowIsoString(),
          llmProvider: fallbackResult.llmProvider,
          llmModel: fallbackResult.llmModel,
          llmPromptVersion: fallbackResult.llmPromptVersion,
          llmErrorMessage: error.message,
          llmFinishedAt: nowIsoString(),
        });
      } catch (fallbackError) {
        return updateRecordGeneration(recordId, {
          reportStatus: "failed",
          report: null,
          llmRetryCount: (existingRecord.llmRetryCount || 0) + 1,
          updatedAt: nowIsoString(),
          llmProvider: env.reportGenerationMode === "llm" ? env.llmProvider : null,
          llmModel: env.reportGenerationMode === "llm" ? env.llmModel : null,
          llmPromptVersion: env.reportGenerationMode === "llm" ? env.llmPromptVersion : null,
          llmErrorMessage: `${error.message}; fallback failed: ${fallbackError.message}`,
          llmFinishedAt: nowIsoString(),
        });
      }
    }

    return updateRecordGeneration(recordId, {
      reportStatus: "failed",
      report: null,
      llmRetryCount: (existingRecord.llmRetryCount || 0) + 1,
      updatedAt: nowIsoString(),
      llmProvider: env.reportGenerationMode === "llm" ? env.llmProvider : null,
      llmModel: env.reportGenerationMode === "llm" ? env.llmModel : null,
      llmPromptVersion: env.reportGenerationMode === "llm" ? env.llmPromptVersion : null,
      llmErrorMessage: error.message,
      llmFinishedAt: nowIsoString(),
    });
  } finally {
    scheduledJobs.delete(recordId);
  }
}

async function generateReportResult(record, assessment) {
  const cachedResult = reportCacheService.getCachedReport(
    assessment,
    record.recordId,
    record.mbtiType
  );

  if (cachedResult) {
    return {
      ...cachedResult,
      source: "cache",
    };
  }

  if (env.reportGenerationMode === "llm") {
    return generateReportWithLlm(
      record.recordId,
      record.mbtiType,
      assessment.themeTitle,
      assessment.reportTitle,
      assessment.questions,
      record.answers
    );
  }

  return {
    report: buildTemplateReport(record, assessment),
    source: "template",
  };
}

function buildTemplateReport(record, assessment) {
  return buildReport(
    record.recordId,
    record.mbtiType,
    assessment.themeTitle,
    assessment.reportTitle
  );
}

function persistReportCache(assessmentId, mbtiType, generationResult) {
  if (generationResult.source === "cache") {
    return;
  }

  reportCacheService.saveCachedReport(assessmentId, mbtiType, generationResult.report, {
    source: generationResult.source || "template",
    llmProvider: generationResult.llmProvider || null,
    llmModel: generationResult.llmModel || null,
    llmPromptVersion: generationResult.llmPromptVersion || null,
  });
}

function scheduleReportGeneration(recordId, delayMs = env.reportDelayMs) {
  if (scheduledJobs.has(recordId)) {
    clearTimeout(scheduledJobs.get(recordId));
  }

  const timer = setTimeout(async () => {
    await completePendingRecord(recordId);
  }, delayMs);

  scheduledJobs.set(recordId, timer);
}

function maybeResolvePendingRecord(record) {
  if (!record || record.reportStatus !== "pending") {
    return record;
  }

  if (!scheduledJobs.has(record.recordId)) {
    scheduleReportGeneration(record.recordId);
  }

  return record;
}

function getReport(recordId, userId) {
  const record = maybeResolvePendingRecord(getRecordOrThrow(recordId));
  ensureRecordAccess(record, userId);

  if (record.reportStatus === "pending") {
    return {
      recordId: record.recordId,
      status: "pending",
      estimatedRetryAfterSeconds: 1,
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
