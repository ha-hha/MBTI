const { getDb } = require("./db");

function mapCache(row) {
  if (!row) {
    return null;
  }

  return {
    assessmentId: row.assessment_id,
    mbtiType: row.mbti_type,
    source: row.source,
    modules: JSON.parse(row.modules_json),
    llmProvider: row.llm_provider,
    llmModel: row.llm_model,
    llmPromptVersion: row.llm_prompt_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getCachedReportByType(assessmentId, mbtiType) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT *
      FROM mbti_report_cache
      WHERE assessment_id = ?
        AND mbti_type = ?
    `)
    .get(assessmentId, mbtiType);

  return mapCache(row);
}

function upsertCachedReport(cacheEntry) {
  const db = getDb();

  db.prepare(`
    INSERT INTO mbti_report_cache (
      assessment_id,
      mbti_type,
      source,
      modules_json,
      llm_provider,
      llm_model,
      llm_prompt_version,
      created_at,
      updated_at
    ) VALUES (
      @assessment_id,
      @mbti_type,
      @source,
      @modules_json,
      @llm_provider,
      @llm_model,
      @llm_prompt_version,
      @created_at,
      @updated_at
    )
    ON CONFLICT(assessment_id, mbti_type) DO UPDATE SET
      source = excluded.source,
      modules_json = excluded.modules_json,
      llm_provider = excluded.llm_provider,
      llm_model = excluded.llm_model,
      llm_prompt_version = excluded.llm_prompt_version,
      updated_at = excluded.updated_at
  `).run({
    assessment_id: cacheEntry.assessmentId,
    mbti_type: cacheEntry.mbtiType,
    source: cacheEntry.source,
    modules_json: JSON.stringify(cacheEntry.modules),
    llm_provider: cacheEntry.llmProvider || null,
    llm_model: cacheEntry.llmModel || null,
    llm_prompt_version: cacheEntry.llmPromptVersion || null,
    created_at: cacheEntry.createdAt,
    updated_at: cacheEntry.updatedAt,
  });

  return getCachedReportByType(cacheEntry.assessmentId, cacheEntry.mbtiType);
}

module.exports = {
  getCachedReportByType,
  upsertCachedReport,
};
