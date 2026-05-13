const { getAssessmentById } = require("../repositories/assessmentRepo");
const {
  getAdminReportById,
  getAdminReportOverview,
  listAdminReports,
} = require("../repositories/adminReportRepo");
const { createError } = require("../utils/errors");

const SUPPORTED_SORTS = new Set(["report_generated_desc", "registered_at_desc"]);

function parsePagination(value, fallbackValue, maxValue) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallbackValue;
  }

  return Math.min(parsedValue, maxValue);
}

function maskWechatId(rawWechatId) {
  if (!rawWechatId) {
    return "";
  }

  if (rawWechatId.length <= 6) {
    return rawWechatId;
  }

  return `${rawWechatId.slice(0, 3)}***${rawWechatId.slice(-3)}`;
}

function getStatusLabel(reportStatus) {
  return reportStatus === "ready" ? "已完成" : "未完成";
}

function getStatusDescription(reportStatus) {
  if (reportStatus === "ready") {
    return "报告已生成";
  }

  if (reportStatus === "pending") {
    return "报告生成中";
  }

  return "报告生成失败";
}

function getFirstAssessmentLabel(isFirstAssessment) {
  return isFirstAssessment ? "首测" : "复测";
}

function getReportGeneratedAt(record) {
  return record.llmFinishedAt || record.updatedAt || "";
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text || "";
  }

  return `${text.slice(0, maxLength)}...`;
}

function extractReportSummary(record) {
  if (record.reportStatus !== "ready" || !record.report) {
    return getStatusDescription(record.reportStatus);
  }

  const firstModule = Array.isArray(record.report.modules) ? record.report.modules[0] : null;
  const firstItem = firstModule && Array.isArray(firstModule.items) ? firstModule.items[0] : "";

  if (firstItem) {
    return truncateText(firstItem, 72);
  }

  return truncateText(record.report.reportTitle || record.report.themeTitle || "报告已生成", 72);
}

function mapListItem(record) {
  const rawWechatId = record.openid || record.userId;

  return {
    recordId: record.recordId,
    reportStatus: record.reportStatus,
    reportStatusLabel: getStatusLabel(record.reportStatus),
    wechatIdMasked: maskWechatId(rawWechatId),
    isRegistered: !!record.phoneNumber,
    registeredAt: record.phoneBoundAt,
    lastLoginAt: record.lastLoginAt,
    phoneNumber: record.phoneNumber,
    assessmentName: record.assessmentName,
    reportGeneratedAt: getReportGeneratedAt(record),
    reportSummary: extractReportSummary(record),
    isFirstAssessment: !!record.isFirstAssessment,
    firstAssessmentLabel: getFirstAssessmentLabel(record.isFirstAssessment),
  };
}

function buildAnswerSummary(record, assessment) {
  const questionMap = new Map(
    (assessment.questions || []).map((question, index) => [question.id, { ...question, index: index + 1 }])
  );

  return (record.answers || [])
    .map((answer) => {
      const question = questionMap.get(answer.questionId);
      const selectedOption = answer.selectedOption;
      const selectedOptionText = question
        ? (question.options || []).find((option) => option.key === selectedOption)?.text || ""
        : "";

      return {
        index: question ? question.index : null,
        questionId: answer.questionId,
        dimension: question ? question.dimension : "",
        stem: question ? question.stem : "",
        selectedOption,
        selectedOptionText,
      };
    })
    .sort((left, right) => {
      const leftIndex = left.index || Number.MAX_SAFE_INTEGER;
      const rightIndex = right.index || Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
}

function buildTrendSeries(rows, days) {
  const normalizedDays = Math.max(1, Number.parseInt(days, 10) || 14);
  const map = new Map(
    rows.map((row) => [
      row.local_date,
      {
        date: row.local_date,
        reportCount: row.report_count || 0,
        uniqueUserCount: row.unique_user_count || 0,
        completedCount: row.completed_count || 0,
      },
    ])
  );
  const series = [];
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const baseTime = Date.now();

  for (let index = normalizedDays - 1; index >= 0; index -= 1) {
    const currentDate = new Date(baseTime - (index * 24 * 60 * 60 * 1000));
    const parts = formatter.formatToParts(currentDate);
    const year = parts.find((item) => item.type === "year")?.value || "0000";
    const month = parts.find((item) => item.type === "month")?.value || "01";
    const day = parts.find((item) => item.type === "day")?.value || "01";
    const isoDate = `${year}-${month}-${day}`;
    const item = map.get(isoDate) || {
      date: isoDate,
      reportCount: 0,
      uniqueUserCount: 0,
      completedCount: 0,
    };

    series.push({
      ...item,
      label: isoDate.slice(5),
    });
  }

  return series;
}

function getReportOverview(days = 14) {
  const overview = getAdminReportOverview(days);
  const totalReports = overview.totals.total_reports || 0;
  const readyReports = overview.totals.ready_reports || 0;
  const completionRate = totalReports > 0
    ? Math.round((readyReports / totalReports) * 1000) / 10
    : 0;

  return {
    summary: {
      todayLabel: new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
      todayUsers: overview.today.today_users || 0,
      todayReports: overview.today.today_reports || 0,
      todayReadyReports: overview.today.today_ready_reports || 0,
      totalUsers: overview.totals.total_users || 0,
      totalReports,
      readyReports,
      pendingReports: overview.totals.pending_reports || 0,
      failedReports: overview.totals.failed_reports || 0,
      registeredUsers: overview.registrations.registered_users || 0,
      completionRate,
    },
    trendDays: Math.max(1, Number.parseInt(days, 10) || 14),
    trend: buildTrendSeries(overview.trend, days),
  };
}

function listReports(query = {}) {
  const page = parsePagination(query.page, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = parsePagination(query.pageSize, 20, 50);
  const sort = SUPPORTED_SORTS.has(query.sort) ? query.sort : "report_generated_desc";
  const result = listAdminReports(page, pageSize, sort);

  return {
    page,
    pageSize,
    total: result.total,
    hasMore: page * pageSize < result.total,
    sort,
    items: result.items.map(mapListItem),
  };
}

function getReportDetail(recordId) {
  const normalizedRecordId = typeof recordId === "string" ? recordId.trim() : "";

  if (!normalizedRecordId) {
    throw createError("ADMIN_REPORT_NOT_FOUND", "report record not found", 404);
  }

  const record = getAdminReportById(normalizedRecordId);

  if (!record) {
    throw createError("ADMIN_REPORT_NOT_FOUND", "report record not found", 404);
  }

  const assessment = getAssessmentById(record.assessmentId);

  if (!assessment) {
    throw createError("ASSESSMENT_NOT_FOUND", "assessment not found", 404);
  }

  const rawWechatId = record.openid || record.userId;

  return {
    recordId: record.recordId,
    reportStatus: record.reportStatus,
    reportStatusLabel: getStatusLabel(record.reportStatus),
    reportStateDescription: getStatusDescription(record.reportStatus),
    reportGeneratedAt: getReportGeneratedAt(record),
    submittedAt: record.submittedAt,
    mbtiType: record.mbtiType,
    assessmentId: record.assessmentId,
    assessmentName: record.assessmentName || assessment.name,
    isFirstAssessment: !!record.isFirstAssessment,
    firstAssessmentLabel: getFirstAssessmentLabel(record.isFirstAssessment),
    user: {
      userId: record.userId,
      wechatIdMasked: maskWechatId(rawWechatId),
      isRegistered: !!record.phoneNumber,
      registeredAt: record.phoneBoundAt,
      lastLoginAt: record.lastLoginAt,
      phoneNumber: record.phoneNumber,
    },
    answers: buildAnswerSummary(record, assessment),
    report: record.reportStatus === "ready" ? record.report : null,
  };
}

module.exports = {
  getReportDetail,
  getReportOverview,
  listReports,
};
