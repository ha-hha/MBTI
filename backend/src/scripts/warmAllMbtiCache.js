const env = require("../config/env");
const { initDb } = require("../repositories/db");
const { seedAssessment, getAssessmentById } = require("../repositories/assessmentRepo");
const { getCachedReportByType } = require("../repositories/reportCacheRepo");
const { VALID_MBTI_TYPES } = require("../utils/mbtiResolver");
const { buildReport } = require("../utils/reportBuilder");
const { saveCachedReport } = require("../services/reportCacheService");
const { generateReportWithLlm } = require("../services/llmReportService");

const ASSESSMENT_ID = "mbti_ai_value";

function getDimensionTargets(mbtiType) {
  const [ei, sn, tf, jp] = mbtiType.split("");

  return {
    EI: ei,
    SN: sn,
    TF: tf,
    JP: jp,
  };
}

function getOptionKeyForLetter(question, letter) {
  if (question.optionLetterMapping.A === letter) {
    return "A";
  }

  if (question.optionLetterMapping.B === letter) {
    return "B";
  }

  throw new Error(`No option found for target letter ${letter} on question ${question.id}`);
}

function buildCanonicalAnswers(questions, mbtiType) {
  const targets = getDimensionTargets(mbtiType);
  const dimensionCounts = {
    EI: 0,
    SN: 0,
    TF: 0,
    JP: 0,
  };

  return questions.map((question) => {
    const currentCount = dimensionCounts[question.dimension];
    const targetLetter = targets[question.dimension];
    const targetOption = getOptionKeyForLetter(question, targetLetter);
    const nonTargetOption = targetOption === "A" ? "B" : "A";
    const selectedOption = currentCount < 3 ? targetOption : nonTargetOption;

    dimensionCounts[question.dimension] += 1;

    return {
      questionId: question.id,
      selectedOption,
    };
  });
}

async function generateResultForType(assessment, mbtiType) {
  const recordId = `prewarm_${mbtiType.toLowerCase()}`;

  if (env.reportGenerationMode === "llm") {
    try {
      return await generateReportWithLlm(
        recordId,
        mbtiType,
        assessment.themeTitle,
        assessment.reportTitle,
        assessment.questions,
        buildCanonicalAnswers(assessment.questions, mbtiType)
      );
    } catch (error) {
      if (!env.llmFallbackToTemplate) {
        throw error;
      }

      return {
        report: buildReport(
          recordId,
          mbtiType,
          assessment.themeTitle,
          assessment.reportTitle
        ),
        source: "template_fallback",
        llmProvider: env.llmProvider || null,
        llmModel: env.llmModel || null,
        llmPromptVersion: env.llmPromptVersion || null,
      };
    }
  }

  return {
    report: buildReport(
      recordId,
      mbtiType,
      assessment.themeTitle,
      assessment.reportTitle
    ),
    source: "template",
    llmProvider: null,
    llmModel: null,
    llmPromptVersion: null,
  };
}

async function main() {
  initDb();
  seedAssessment();

  const assessment = getAssessmentById(ASSESSMENT_ID);

  if (!assessment) {
    throw new Error(`Assessment not found: ${ASSESSMENT_ID}`);
  }

  const shouldRefresh = process.argv.includes("--refresh");
  const mbtiTypes = [...VALID_MBTI_TYPES];
  const summary = {
    generated: [],
    skipped: [],
  };

  for (const mbtiType of mbtiTypes) {
    const existingCache = getCachedReportByType(ASSESSMENT_ID, mbtiType);

    if (existingCache && !shouldRefresh) {
      summary.skipped.push({
        mbtiType,
        source: existingCache.source,
      });
      continue;
    }

    const generationResult = await generateResultForType(assessment, mbtiType);

    saveCachedReport(ASSESSMENT_ID, mbtiType, generationResult.report, {
      source: generationResult.source || "template",
      llmProvider: generationResult.llmProvider || null,
      llmModel: generationResult.llmModel || null,
      llmPromptVersion: generationResult.llmPromptVersion || null,
    });

    summary.generated.push({
      mbtiType,
      source: generationResult.source || "template",
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
