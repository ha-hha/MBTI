const { getDb } = require("./db");

function mapRecord(row) {
  if (!row) {
    return null;
  }

  return {
    recordId: row.record_id,
    assessmentId: row.assessment_id,
    userId: row.user_id,
    answers: JSON.parse(row.answers_json),
    mbtiType: row.mbti_type,
    reportStatus: row.report_status,
    report: row.report_json ? JSON.parse(row.report_json) : null,
    llmRetryCount: row.llm_retry_count,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createRecord(record) {
  const db = getDb();

  db.prepare(`
    INSERT INTO assessment_records (
      record_id,
      assessment_id,
      user_id,
      answers_json,
      mbti_type,
      report_status,
      report_json,
      llm_retry_count,
      submitted_at,
      created_at,
      updated_at
    ) VALUES (
      @record_id,
      @assessment_id,
      @user_id,
      @answers_json,
      @mbti_type,
      @report_status,
      @report_json,
      @llm_retry_count,
      @submitted_at,
      @created_at,
      @updated_at
    )
  `).run({
    record_id: record.recordId,
    assessment_id: record.assessmentId,
    user_id: record.userId,
    answers_json: JSON.stringify(record.answers),
    mbti_type: record.mbtiType,
    report_status: record.reportStatus,
    report_json: record.report ? JSON.stringify(record.report) : null,
    llm_retry_count: record.llmRetryCount || 0,
    submitted_at: record.submittedAt,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  });

  return getRecordById(record.recordId);
}

function getRecordById(recordId) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM assessment_records WHERE record_id = ?")
    .get(recordId);

  return mapRecord(row);
}

function updateRecordStatus(recordId, reportStatus, report, llmRetryCount, updatedAt) {
  const db = getDb();

  db.prepare(`
    UPDATE assessment_records
    SET report_status = ?,
        report_json = ?,
        llm_retry_count = ?,
        updated_at = ?
    WHERE record_id = ?
  `).run(
    reportStatus,
    report ? JSON.stringify(report) : null,
    llmRetryCount,
    updatedAt,
    recordId
  );

  return getRecordById(recordId);
}

function listRecordsByUserAndAssessment(userId, assessmentId, page, pageSize) {
  const db = getDb();
  const totalRow = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM assessment_records
      WHERE user_id = ?
        AND assessment_id = ?
        AND report_status != 'failed'
    `)
    .get(userId, assessmentId);

  const offset = (page - 1) * pageSize;
  const rows = db
    .prepare(`
      SELECT *
      FROM assessment_records
      WHERE user_id = ?
        AND assessment_id = ?
        AND report_status != 'failed'
      ORDER BY created_at DESC
      LIMIT ?
      OFFSET ?
    `)
    .all(userId, assessmentId, pageSize, offset);

  return {
    total: totalRow.total,
    items: rows.map(mapRecord),
  };
}

module.exports = {
  createRecord,
  getRecordById,
  updateRecordStatus,
  listRecordsByUserAndAssessment,
};
