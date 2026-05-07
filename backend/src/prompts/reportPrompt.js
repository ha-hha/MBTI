const fs = require("fs");
const env = require("../config/env");
const { EXPECTED_MODULES } = require("../utils/reportValidator");

function getSystemPrompt() {
  if (fs.existsSync(env.llmSystemPromptPath)) {
    return fs.readFileSync(env.llmSystemPromptPath, "utf8").trim();
  }

  return [
    "你是专业的 MBTI 职业发展分析师。",
    "只输出合法 JSON 对象，不要 Markdown，不要解释。",
    "mbtiType 必须与输入一致。",
    "modules 必须固定 4 个，顺序、key、title 必须与调用方要求一致。",
    "每个模块固定 3 条 items，每条尽量短、信息密度高、避免重复。",
  ].join("\n");
}

function buildDimensionBreakdown(questions, answers) {
  const sortedQuestions = [...questions].sort((left, right) => {
    const leftOrder = left.sortOrder || Number.parseInt(left.id.replace("Q", ""), 10);
    const rightOrder = right.sortOrder || Number.parseInt(right.id.replace("Q", ""), 10);
    return leftOrder - rightOrder;
  });

  const answerMap = answers.reduce((accumulator, answer) => {
    accumulator[answer.questionId] = answer.selectedOption;
    return accumulator;
  }, {});

  const groups = [
    { key: "EI", targetA: "E", targetB: "I", questions: sortedQuestions.slice(0, 5) },
    { key: "SN", targetA: "S", targetB: "N", questions: sortedQuestions.slice(5, 10) },
    { key: "TF", targetA: "T", targetB: "F", questions: sortedQuestions.slice(10, 15) },
    { key: "JP", targetA: "J", targetB: "P", questions: sortedQuestions.slice(15, 20) },
  ];

  return groups.map((group) => {
    const selections = group.questions.map((question) => answerMap[question.id]);
    const aCount = selections.filter((item) => item === "A").length;
    const bCount = selections.filter((item) => item === "B").length;

    return {
      d: group.key,
      a: aCount,
      b: bCount,
      r: aCount >= 3 ? group.targetA : group.targetB,
    };
  });
}

function buildModuleRequirements() {
  return EXPECTED_MODULES.map((moduleItem) => ({
    k: moduleItem.key,
    t: moduleItem.title,
    n: 3,
  }));
}

function buildUserPrompt(mbtiType, questions, answers) {
  return JSON.stringify(
    {
      t: "mbti_report",
      m: mbtiType,
      d: buildDimensionBreakdown(questions, answers),
      o: buildModuleRequirements(),
      r: "json_only_zh",
    },
    null,
    0
  );
}

function buildReportMessages(recordId, mbtiType, themeTitle, reportTitle, questions, answers) {
  return [
    {
      role: "system",
      content: getSystemPrompt(),
    },
    {
      role: "user",
      content: buildUserPrompt(mbtiType, questions, answers),
    },
  ];
}

module.exports = {
  buildReportMessages,
};
