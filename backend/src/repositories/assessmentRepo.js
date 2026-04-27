const path = require("path");
const { getDb } = require("./db");

const { assessmentConfig } = require(path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "utils",
  "assessment-config"
));

function toQuestionRow(question, assessmentId, sortOrder) {
  return {
    id: question.id,
    assessment_id: assessmentId,
    dimension: question.dimension,
    stem: question.stem,
    option_a_text: question.options[0].text,
    option_b_text: question.options[1].text,
    option_a_letter: question.optionLetterMapping.A,
    option_b_letter: question.optionLetterMapping.B,
    sort_order: sortOrder,
  };
}

function seedAssessment() {
  const db = getDb();

  db.prepare(`
    INSERT OR REPLACE INTO assessments (
      id,
      name,
      theme_title,
      report_title,
      start_copy,
      end_copy,
      welcome_copy_pool_json,
      share_copy_pool_json,
      question_count
    ) VALUES (
      @id,
      @name,
      @theme_title,
      @report_title,
      @start_copy,
      @end_copy,
      @welcome_copy_pool_json,
      @share_copy_pool_json,
      @question_count
    )
  `).run({
    id: assessmentConfig.id,
    name: assessmentConfig.name,
    theme_title: assessmentConfig.themeTitle,
    report_title: assessmentConfig.reportTitle,
    start_copy: assessmentConfig.startCopy,
    end_copy: assessmentConfig.endCopy,
    welcome_copy_pool_json: JSON.stringify(assessmentConfig.welcomeCopyPool),
    share_copy_pool_json: JSON.stringify(assessmentConfig.shareCopyPool),
    question_count: assessmentConfig.questionCount,
  });

  const deleteQuestionStatement = db.prepare(
    "DELETE FROM questions WHERE assessment_id = ?"
  );
  deleteQuestionStatement.run(assessmentConfig.id);

  const insertQuestionStatement = db.prepare(`
    INSERT INTO questions (
      id,
      assessment_id,
      dimension,
      stem,
      option_a_text,
      option_b_text,
      option_a_letter,
      option_b_letter,
      sort_order
    ) VALUES (
      @id,
      @assessment_id,
      @dimension,
      @stem,
      @option_a_text,
      @option_b_text,
      @option_a_letter,
      @option_b_letter,
      @sort_order
    )
  `);

  assessmentConfig.questions.forEach((question, index) => {
    insertQuestionStatement.run(toQuestionRow(question, assessmentConfig.id, index + 1));
  });
}

function mapQuestion(row) {
  return {
    id: row.id,
    dimension: row.dimension,
    stem: row.stem,
    options: [
      { key: "A", text: row.option_a_text },
      { key: "B", text: row.option_b_text },
    ],
    optionLetterMapping: {
      A: row.option_a_letter,
      B: row.option_b_letter,
    },
  };
}

function mapAssessment(row, questions) {
  return {
    id: row.id,
    name: row.name,
    themeTitle: row.theme_title,
    reportTitle: row.report_title,
    welcomeCopyPool: JSON.parse(row.welcome_copy_pool_json),
    startCopy: row.start_copy,
    endCopy: row.end_copy,
    shareCopyPool: JSON.parse(row.share_copy_pool_json),
    questionCount: row.question_count,
    questions,
  };
}

function getAssessmentById(assessmentId) {
  const db = getDb();
  const assessmentRow = db
    .prepare("SELECT * FROM assessments WHERE id = ?")
    .get(assessmentId);

  if (!assessmentRow) {
    return null;
  }

  const questionRows = db
    .prepare("SELECT * FROM questions WHERE assessment_id = ? ORDER BY sort_order ASC")
    .all(assessmentId);

  return mapAssessment(assessmentRow, questionRows.map(mapQuestion));
}

module.exports = {
  seedAssessment,
  getAssessmentById,
};
