const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const env = require("../config/env");

let database;

function ensureDatabaseDirectory() {
  fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });
}

function getDb() {
  if (!database) {
    ensureDatabaseDirectory();
    database = new Database(env.dbPath);
    database.pragma("journal_mode = WAL");
  }

  return database;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      theme_title TEXT NOT NULL,
      report_title TEXT NOT NULL,
      start_copy TEXT NOT NULL,
      end_copy TEXT NOT NULL,
      welcome_copy_pool_json TEXT NOT NULL,
      share_copy_pool_json TEXT NOT NULL,
      question_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      dimension TEXT NOT NULL,
      stem TEXT NOT NULL,
      option_a_text TEXT NOT NULL,
      option_b_text TEXT NOT NULL,
      option_a_letter TEXT NOT NULL,
      option_b_letter TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (assessment_id) REFERENCES assessments (id)
    );

    CREATE TABLE IF NOT EXISTS assessment_records (
      record_id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      mbti_type TEXT NOT NULL,
      report_status TEXT NOT NULL,
      report_json TEXT,
      llm_retry_count INTEGER NOT NULL DEFAULT 0,
      submitted_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (assessment_id) REFERENCES assessments (id)
    );

    CREATE TABLE IF NOT EXISTS mbti_report_cache (
      assessment_id TEXT NOT NULL,
      mbti_type TEXT NOT NULL,
      source TEXT NOT NULL,
      modules_json TEXT NOT NULL,
      llm_provider TEXT,
      llm_model TEXT,
      llm_prompt_version TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (assessment_id, mbti_type),
      FOREIGN KEY (assessment_id) REFERENCES assessments (id)
    );

    CREATE INDEX IF NOT EXISTS idx_questions_assessment_sort
    ON questions (assessment_id, sort_order);

    CREATE INDEX IF NOT EXISTS idx_records_user_assessment_created
    ON assessment_records (user_id, assessment_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_report_cache_assessment_mbti
    ON mbti_report_cache (assessment_id, mbti_type);
  `);

  ensureAssessmentRecordColumns(db);

  return db;
}

function hasColumn(db, tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function ensureAssessmentRecordColumns(db) {
  const columnDefinitions = [
    "llm_provider TEXT",
    "llm_model TEXT",
    "llm_prompt_version TEXT",
    "llm_raw_response TEXT",
    "llm_error_message TEXT",
    "llm_finished_at TEXT",
  ];

  columnDefinitions.forEach((definition) => {
    const [columnName] = definition.split(" ");

    if (!hasColumn(db, "assessment_records", columnName)) {
      db.exec(`ALTER TABLE assessment_records ADD COLUMN ${definition}`);
    }
  });
}

module.exports = {
  getDb,
  initDb,
};
