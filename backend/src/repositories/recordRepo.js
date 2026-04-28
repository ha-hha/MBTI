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
    llmProvider: row.llm_provider,
    llmModel: row.llm_model,
    llmPromptVersion: row.llm_prompt_version,
    llmRawResponse: row.llm_raw_response,
    llmErrorMessage: row.llm_error_message,
    llmFinishedAt: row.llm_finished_at,
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
      llm_provider,
      llm_model,
      llm_prompt_version,
      llm_raw_response,
      llm_error_message,
      llm_finished_at,
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
      @llm_provider,
      @llm_model,
      @llm_prompt_version,
      @llm_raw_response,
      @llm_error_message,
      @llm_finished_at,
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
    llm_provider: record.llmProvider || null,
    llm_model: record.llmModel || null,
    llm_prompt_version: record.llmPromptVersion || null,
    llm_raw_response: record.llmRawResponse || null,
    llm_error_message: record.llmErrorMessage || null,
    llm_finished_at: record.llmFinishedAt || null,
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
  return updateRecordGeneration(recordId, {
    reportStatus,
    report,
    llmRetryCount,
    updatedAt,
  });
}

function updateRecordGeneration(recordId, updates) {
  const db = getDb();

  db.prepare(`
    UPDATE assessment_records
    SET report_status = ?,
        report_json = ?,
        llm_retry_count = ?,
        updated_at = ?,
        llm_provider = ?,
        llm_model = ?,
        llm_prompt_version = ?,
        llm_raw_response = ?,
        llm_error_message = ?,
        llm_finished_at = ?
    WHERE record_id = ?
  `).run(
    updates.reportStatus,
    updates.report ? JSON.stringify(updates.report) : null,
    updates.llmRetryCount,
    updates.updatedAt,
    updates.llmProvider || null,
    updates.llmModel || null,
    updates.llmPromptVersion || null,
    updates.llmRawResponse || null,
    updates.llmErrorMessage || null,
    updates.llmFinishedAt || null,
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

function listLatestReadyRecordsByAssessment(assessmentId) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT *
      FROM assessment_records
      WHERE assessment_id = ?
        AND report_status = 'ready'
      ORDER BY created_at DESC
    `)
    .all(assessmentId);

  const latestByMbti = new Map();

  rows.forEach((row) => {
    if (!latestByMbti.has(row.mbti_type)) {
      latestByMbti.set(row.mbti_type, mapRecord(row));
    }
  });

  return [...latestByMbti.values()];
}

module.exports = {
  createRecord,
  getRecordById,
  updateRecordStatus,
  updateRecordGeneration,
  listRecordsByUserAndAssessment,
  listLatestReadyRecordsByAssessment,
};
