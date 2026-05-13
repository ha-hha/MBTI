const { getDb } = require("./db");

const REPORT_DATE_EXPRESSION = "COALESCE(ar.llm_finished_at, ar.submitted_at, ar.created_at)";
const FIRST_RECORD_SUBQUERY = `
  SELECT ar2.record_id
  FROM assessment_records ar2
  WHERE ar2.user_id = ar.user_id
  ORDER BY ar2.submitted_at ASC, ar2.created_at ASC, ar2.record_id ASC
  LIMIT 1
`;

function parseJson(value, fallbackValue) {
  if (!value) {
    return fallbackValue;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallbackValue;
  }
}

function mapAdminReportRow(row) {
  if (!row) {
    return null;
  }

  return {
    recordId: row.record_id,
    assessmentId: row.assessment_id,
    assessmentName: row.assessment_name || "",
    userId: row.user_id,
    openid: row.openid || "",
    phoneNumber: row.phone_number || "",
    phoneBoundAt: row.phone_bound_at || "",
    lastLoginAt: row.last_login_at || "",
    isFirstAssessment: !!row.is_first_assessment,
    answers: parseJson(row.answers_json, []),
    mbtiType: row.mbti_type,
    reportStatus: row.report_status,
    report: parseJson(row.report_json, null),
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    llmFinishedAt: row.llm_finished_at || "",
  };
}

function getOrderByClause(sort) {
  switch (sort) {
    case "registered_at_desc":
      return `
        ORDER BY
          CASE WHEN u.phone_bound_at IS NULL OR u.phone_bound_at = '' THEN 1 ELSE 0 END ASC,
          u.phone_bound_at DESC,
          COALESCE(ar.llm_finished_at, ar.updated_at) DESC,
          ar.created_at DESC
      `;
    case "report_generated_desc":
    default:
      return `
        ORDER BY
          COALESCE(ar.llm_finished_at, ar.updated_at) DESC,
          ar.created_at DESC
      `;
  }
}

function listAdminReports(page, pageSize, sort) {
  const db = getDb();
  const offset = (page - 1) * pageSize;
  const orderByClause = getOrderByClause(sort);
  const totalRow = db.prepare("SELECT COUNT(*) AS total FROM assessment_records").get();

  const rows = db.prepare(`
    SELECT
      ar.record_id,
      ar.assessment_id,
      ar.user_id,
      ar.answers_json,
      ar.mbti_type,
      ar.report_status,
      ar.report_json,
      ar.submitted_at,
      ar.created_at,
      ar.updated_at,
      ar.llm_finished_at,
      a.name AS assessment_name,
      u.openid,
      u.phone_number,
      u.phone_bound_at,
      u.last_login_at,
      CASE
        WHEN ar.record_id = (${FIRST_RECORD_SUBQUERY}) THEN 1
        ELSE 0
      END AS is_first_assessment
    FROM assessment_records ar
    LEFT JOIN assessments a
      ON a.id = ar.assessment_id
    LEFT JOIN users u
      ON u.user_id = ar.user_id
    ${orderByClause}
    LIMIT ?
    OFFSET ?
  `).all(pageSize, offset);

  return {
    total: totalRow.total,
    items: rows.map(mapAdminReportRow),
  };
}

function getAdminReportById(recordId) {
  const db = getDb();
  const normalizedRecordId = typeof recordId === "string" ? recordId.trim() : "";

  if (!normalizedRecordId) {
    return null;
  }

  const row = db.prepare(`
    SELECT
      ar.record_id,
      ar.assessment_id,
      ar.user_id,
      ar.answers_json,
      ar.mbti_type,
      ar.report_status,
      ar.report_json,
      ar.submitted_at,
      ar.created_at,
      ar.updated_at,
      ar.llm_finished_at,
      a.name AS assessment_name,
      u.openid,
      u.phone_number,
      u.phone_bound_at,
      u.last_login_at,
      CASE
        WHEN ar.record_id = (${FIRST_RECORD_SUBQUERY}) THEN 1
        ELSE 0
      END AS is_first_assessment
    FROM assessment_records ar
    LEFT JOIN assessments a
      ON a.id = ar.assessment_id
    LEFT JOIN users u
      ON u.user_id = ar.user_id
    WHERE ar.record_id = ?
  `).get(normalizedRecordId);

  return mapAdminReportRow(row);
}

function getAdminReportOverview(days) {
  const db = getDb();
  const windowDays = Math.max(1, Number.parseInt(days, 10) || 14);
  const dayOffset = windowDays - 1;

  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total_reports,
      COUNT(DISTINCT ar.user_id) AS total_users,
      SUM(CASE WHEN ar.report_status = 'ready' THEN 1 ELSE 0 END) AS ready_reports,
      SUM(CASE WHEN ar.report_status = 'pending' THEN 1 ELSE 0 END) AS pending_reports,
      SUM(CASE WHEN ar.report_status = 'failed' THEN 1 ELSE 0 END) AS failed_reports
    FROM assessment_records ar
  `).get();

  const today = db.prepare(`
    SELECT
      COUNT(*) AS today_reports,
      COUNT(DISTINCT ar.user_id) AS today_users,
      SUM(CASE WHEN ar.report_status = 'ready' THEN 1 ELSE 0 END) AS today_ready_reports
    FROM assessment_records ar
    WHERE date(${REPORT_DATE_EXPRESSION}, '+8 hours') = date('now', '+8 hours')
  `).get();

  const registrations = db.prepare(`
    SELECT
      COUNT(*) AS registered_users
    FROM users
    WHERE phone_number IS NOT NULL
      AND phone_number <> ''
  `).get();

  const trend = db.prepare(`
    SELECT
      date(${REPORT_DATE_EXPRESSION}, '+8 hours') AS local_date,
      COUNT(*) AS report_count,
      COUNT(DISTINCT ar.user_id) AS unique_user_count,
      SUM(CASE WHEN ar.report_status = 'ready' THEN 1 ELSE 0 END) AS completed_count
    FROM assessment_records ar
    WHERE date(${REPORT_DATE_EXPRESSION}, '+8 hours') >= date('now', '+8 hours', '-' || ? || ' day')
    GROUP BY local_date
    ORDER BY local_date ASC
  `).all(dayOffset);

  return {
    totals,
    today,
    registrations,
    trend,
  };
}

module.exports = {
  getAdminReportById,
  getAdminReportOverview,
  listAdminReports,
};
